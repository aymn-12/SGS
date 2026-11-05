from ortools.sat.python import cp_model
import config

class AcademicTimetableSolver:
    def __init__(self, data):
        """
        data dictionary containing:
        - stages: list of stages
        - courses: list of courses
        - rooms: list of available rooms
        - availabilities: list of doctor availability preferences
        """
        self.stages = {str(s["_id"]): s for s in data["stages"]}
        self.courses = data["courses"]
        self.rooms = {str(r["_id"]): r for r in data["rooms"]}
        self.availabilities = data["availabilities"]

        self.days = config.DAYS_OF_WEEK
        self.time_slots = config.TIME_SLOTS
        self.total_slots_per_day = len(self.time_slots)
        self.total_time_points = len(self.days) * self.total_slots_per_day

        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()

    def _get_time_info(self, t_idx):
        day_idx = t_idx // self.total_slots_per_day
        slot_idx = t_idx % self.total_slots_per_day
        return self.days[day_idx], self.time_slots[slot_idx]

    def _is_doctor_available(self, doctor_id, day, slot):
        for avail_doc in self.availabilities:
            if str(avail_doc.get("doctor")) == str(doctor_id):
                for item in avail_doc.get("availability", []):
                    if item.get("dayOfWeek") == day and item.get("timeSlot") == slot:
                        return item.get("isAvailable", True)
        return True

    def build_and_solve(self):
        # 1. Decompose courses into individual lecture sessions
        sessions = []
        for course in self.courses:
            c_id = str(course["_id"])
            stage_id = str(course["stage"])
            doctor_id = str(course.get("assignedDoctor", ""))
            c_type = course.get("type", "THEORY")
            hours = course.get("creditHours", 2)
            student_count = self.stages[stage_id].get("studentCount", 30) if stage_id in self.stages else 30

            for session_num in range(hours):
                sessions.append({
                    "session_id": f"{c_id}_session_{session_num}",
                    "course_id": c_id,
                    "stage_id": stage_id,
                    "doctor_id": doctor_id,
                    "course_type": c_type,
                    "student_count": student_count,
                    "course_name": course.get("name", "Unknown"),
                })

        if not sessions:
            return {"status": "EMPTY", "message": "لا توجد مواد دراسية للجدولة", "slots": []}

        # 2. Decision Variables: x[session_idx, t_idx, room_id] -> 0 or 1
        x = {}
        session_compatible_rooms = {}

        for s_idx, session in enumerate(sessions):
            # Find compatible rooms for this session
            compatible_rooms = []
            for r_id, room in self.rooms.items():
                # Constraint: Capacity Check
                if room.get("capacity", 0) < session["student_count"]:
                    continue

                # Constraint: Room Type Compatibility
                if session["course_type"] == "PRACTICAL":
                    if room.get("roomType") != "LAB":
                        continue
                else:
                    # Theory courses prefer lecture halls, but can use labs if necessary
                    if room.get("roomType") not in ["LECTURE_HALL", "LAB"]:
                        continue

                compatible_rooms.append(r_id)

            if not compatible_rooms:
                return {
                    "status": "INFEASIBLE",
                    "message": f"لا توجد قاعة تتسع للمادة '{session['course_name']}' (سعة مطلوبة: {session['student_count']})",
                    "slots": []
                }

            session_compatible_rooms[s_idx] = compatible_rooms

            for t_idx in range(self.total_time_points):
                day, slot = self._get_time_info(t_idx)

                # Hard Constraint: Doctor Availability
                if session["doctor_id"] and not self._is_doctor_available(session["doctor_id"], day, slot):
                    continue

                for r_id in compatible_rooms:
                    x[s_idx, t_idx, r_id] = self.model.NewBoolVar(f"x_{s_idx}_{t_idx}_{r_id}")

        # 3. Hard Constraint 1: Exact Assignment (Each session assigned exactly once)
        for s_idx in range(len(sessions)):
            assigned_vars = [
                x[s_idx, t_idx, r_id]
                for t_idx in range(self.total_time_points)
                for r_id in session_compatible_rooms[s_idx]
                if (s_idx, t_idx, r_id) in x
            ]
            if not assigned_vars:
                return {
                    "status": "INFEASIBLE",
                    "message": f"تعذر إيجاد فترة زمنية متاحة للأستاذ في مادة '{sessions[s_idx]['course_name']}'",
                    "slots": []
                }
            self.model.Add(sum(assigned_vars) == 1)

        # 4. Hard Constraint 2: Room Exclusivity (No two sessions in same room at same time)
        for r_id in self.rooms.keys():
            for t_idx in range(self.total_time_points):
                room_time_vars = [
                    x[s_idx, t_idx, r_id]
                    for s_idx in range(len(sessions))
                    if (s_idx, t_idx, r_id) in x
                ]
                if len(room_time_vars) > 1:
                    self.model.Add(sum(room_time_vars) <= 1)

        # 5. Hard Constraint 3: Doctor Exclusivity (No doctor teaches two lectures at same time)
        unique_doctors = set(s["doctor_id"] for s in sessions if s["doctor_id"])
        for doc_id in unique_doctors:
            for t_idx in range(self.total_time_points):
                doctor_time_vars = [
                    x[s_idx, t_idx, r_id]
                    for s_idx, s in enumerate(sessions)
                    if s["doctor_id"] == doc_id
                    for r_id in session_compatible_rooms[s_idx]
                    if (s_idx, t_idx, r_id) in x
                ]
                if len(doctor_time_vars) > 1:
                    self.model.Add(sum(doctor_time_vars) <= 1)

        # 6. Hard Constraint 4: Stage Exclusivity (Students of same stage cannot have 2 classes at once)
        unique_stages = set(s["stage_id"] for s in sessions)
        for stg_id in unique_stages:
            for t_idx in range(self.total_time_points):
                stage_time_vars = [
                    x[s_idx, t_idx, r_id]
                    for s_idx, s in enumerate(sessions)
                    if s["stage_id"] == stg_id
                    for r_id in session_compatible_rooms[s_idx]
                    if (s_idx, t_idx, r_id) in x
                ]
                if len(stage_time_vars) > 1:
                    self.model.Add(sum(stage_time_vars) <= 1)

        # 7. Soft Constraints: Optimization Objectives
        objective_terms = []

        # Objective A: Spread multiple sessions of the same course across different days
        course_to_sessions = {}
        for s_idx, s in enumerate(sessions):
            course_to_sessions.setdefault(s["course_id"], []).append(s_idx)

        for c_id, s_indices in course_to_sessions.items():
            if len(s_indices) > 1:
                # Penalty if two sessions of the same course are scheduled on the same day
                for d_idx, day in enumerate(self.days):
                    day_t_indices = range(d_idx * self.total_slots_per_day, (d_idx + 1) * self.total_slots_per_day)
                    sessions_on_this_day = []
                    for s_idx in s_indices:
                        for t in day_t_indices:
                            for r_id in session_compatible_rooms[s_idx]:
                                if (s_idx, t, r_id) in x:
                                    sessions_on_this_day.append(x[s_idx, t, r_id])
                    if len(sessions_on_this_day) > 1:
                        # Add penalty for same day duplication
                        same_day_penalty = self.model.NewIntVar(0, len(sessions_on_this_day), f"penalty_{c_id}_{day}")
                        self.model.Add(same_day_penalty >= sum(sessions_on_this_day) - 1)
                        objective_terms.append(-10 * same_day_penalty)

        # Objective B: Balance Doctor Daily Workload (avoid exhausting a doctor with >3 sessions/day)
        for doc_id in unique_doctors:
            for d_idx, day in enumerate(self.days):
                day_t_indices = range(d_idx * self.total_slots_per_day, (d_idx + 1) * self.total_slots_per_day)
                doc_day_vars = [
                    x[s_idx, t, r_id]
                    for s_idx, s in enumerate(sessions)
                    if s["doctor_id"] == doc_id
                    for t in day_t_indices
                    for r_id in session_compatible_rooms[s_idx]
                    if (s_idx, t, r_id) in x
                ]
                if len(doc_day_vars) > 3:
                    overload_penalty = self.model.NewIntVar(0, len(doc_day_vars), f"doc_overload_{doc_id}_{day}")
                    self.model.Add(overload_penalty >= sum(doc_day_vars) - 3)
                    objective_terms.append(-5 * overload_penalty)

        if objective_terms:
            self.model.Maximize(sum(objective_terms))

        # 8. Configure and Run Optimized Solver Engine
        self.solver.parameters.max_time_in_seconds = config.SOLVER_TIME_LIMIT_SECONDS
        self.solver.parameters.num_search_workers = 8  # Scale across available CPU cores
        self.solver.parameters.cp_model_presolve = True  # High-level domain reduction
        self.solver.parameters.linearization_level = 2  # Aggressive MIP cuts & LP relaxation

        status = self.solver.Solve(self.model)

        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            generated_slots = []
            for (s_idx, t_idx, r_id), var in x.items():
                if self.solver.Value(var) == 1:
                    day, slot = self._get_time_info(t_idx)
                    session = sessions[s_idx]
                    generated_slots.append({
                        "course_id": session["course_id"],
                        "stage_id": session["stage_id"],
                        "doctor_id": session["doctor_id"],
                        "room_id": r_id,
                        "day_of_week": day,
                        "time_slot": slot,
                        "course_type": session["course_type"],
                    })

            return {
                "status": "SUCCESS",
                "message": "تم توليد الجدول بنجاح دون أي تعارضات",
                "slots": generated_slots,
            }
        else:
            return {
                "status": "INFEASIBLE",
                "message": "تعذر إيجاد حل يحقق جميع الشروط والقيود المعطاة (يرجى مراجعة القاعات المتاحة وأوقات التفرغ)",
                "slots": [],
            }
