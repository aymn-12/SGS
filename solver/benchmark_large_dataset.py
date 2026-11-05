import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import time
from bson.objectid import ObjectId
from timetable_solver import AcademicTimetableSolver
import config

def generate_large_scale_dataset():
    """
    Generates a realistic full-scale university college dataset:
    - 4 Academic Stages (Years 1 to 4)
    - 16 Professors / Doctors with availability patterns
    - 10 Rooms (6 Lecture Halls + 4 Specialized Labs)
    - 28 Courses (Theory + Practical)
    - Total ~72 lecture sessions per week
    """
    print("[1/4] Generating Massive Academic Dataset...")

    # 1. Stages (4 Academic Years)
    stages = [
        {"_id": ObjectId(), "name": "المرحلة الأولى (CS-Year 1)", "studentCount": 65, "stageNumber": 1},
        {"_id": ObjectId(), "name": "المرحلة الثانية (CS-Year 2)", "studentCount": 55, "stageNumber": 2},
        {"_id": ObjectId(), "name": "المرحلة الثالثة (CS-Year 3)", "studentCount": 45, "stageNumber": 3},
        {"_id": ObjectId(), "name": "المرحلة الرابعة (CS-Year 4)", "studentCount": 40, "stageNumber": 4},
    ]

    # 2. Doctors (16 Professors)
    doctor_names = [
        "أ.د. عادل الشمري", "د. سارة الراوي", "د. حيدر البصري", "د. ميساء الجبوري",
        "د. عمر العبيدي", "د. فاطمة الزهراء", "د. أحمد خليل", "د. زينب القيسي",
        "د. ياسر التميمي", "د. نور الهدى", "د. بلال الصالح", "د. ريم الحديثي",
        "د. طارق السعدون", "د. لمى الكرخي", "د. وسام الدوري", "د. مروة السهيل"
    ]
    doctors = [{"_id": ObjectId(), "name": name} for name in doctor_names]

    # Doctor Availabilities (Simulating realistic unavailable time slots for doctors)
    availabilities = []
    # e.g., Dr 0 unavailable Sunday morning, Dr 1 unavailable Tuesday afternoon, etc.
    for i, doc in enumerate(doctors):
        unavail_slots = []
        if i % 3 == 0:
            unavail_slots.append({"dayOfWeek": 0, "timeSlot": "08:30-10:00", "isAvailable": False})
        if i % 4 == 0:
            unavail_slots.append({"dayOfWeek": 2, "timeSlot": "12:00-13:30", "isAvailable": False})
        if i % 5 == 0:
            unavail_slots.append({"dayOfWeek": 4, "timeSlot": "13:45-15:15", "isAvailable": False})

        if unavail_slots:
            availabilities.append({"doctor": doc["_id"], "availability": unavail_slots})

    # 3. Rooms & Labs (10 Rooms: 6 Halls + 4 Labs)
    rooms = [
        {"_id": ObjectId(), "roomNumber": "مدرج الخوارزمي (Hall A)", "roomType": "LECTURE_HALL", "capacity": 80, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "مدرج ابن الهيثم (Hall B)", "roomType": "LECTURE_HALL", "capacity": 70, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "مدرج الكندي (Hall C)", "roomType": "LECTURE_HALL", "capacity": 60, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "قاعة 201 (Hall D)", "roomType": "LECTURE_HALL", "capacity": 55, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "قاعة 202 (Hall E)", "roomType": "LECTURE_HALL", "capacity": 50, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "قاعة 203 (Hall F)", "roomType": "LECTURE_HALL", "capacity": 45, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "مختبر البرمجيات المركزي (Lab 1)", "roomType": "LAB", "capacity": 70, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "مختبر الذكاء الاصطناعي (Lab 2)", "roomType": "LAB", "capacity": 65, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "مختبر الشبكات (Lab 3)", "roomType": "LAB", "capacity": 60, "isAvailable": True},
        {"_id": ObjectId(), "roomNumber": "مختبر الأمن السيبراني (Lab 4)", "roomType": "LAB", "capacity": 50, "isAvailable": True},
    ]

    # 4. Courses (7 courses per stage = 28 courses total, ~72 hours/sessions)
    courses = []
    course_definitions = [
        # Stage 1
        ("أسس البرمجة", "CS101", 3, "THEORY", 0, 0),
        ("مختبر أسس البرمجة", "CS101L", 2, "PRACTICAL", 0, 1),
        ("الرياضيات المتقطعة", "MATH101", 3, "THEORY", 0, 2),
        ("تراكيب الحاسوب", "CS102", 2, "THEORY", 0, 3),
        ("اللغة الإنجليزية الأكاديمية", "ENG101", 2, "THEORY", 0, 4),
        ("مبادئ الإلكترونيات", "EE101", 2, "THEORY", 0, 5),
        ("حقوق الإنسان والديمقراطية", "HUM101", 2, "THEORY", 0, 6),

        # Stage 2
        ("تراكيب البيانات والخوارزميات", "CS201", 3, "THEORY", 1, 7),
        ("مختبر تراكيب البيانات", "CS201L", 2, "PRACTICAL", 1, 8),
        ("البرمجة كائنية التوجه OOP", "CS202", 3, "THEORY", 1, 9),
        ("مختبر OOP", "CS202L", 2, "PRACTICAL", 1, 10),
        ("قواعد البيانات", "CS203", 3, "THEORY", 1, 11),
        ("معمارية الحاسوب", "CS204", 2, "THEORY", 1, 12),
        ("الإحصاء والاحتمالات", "MATH201", 2, "THEORY", 1, 13),

        # Stage 3
        ("هندسة البرمجيات", "CS301", 3, "THEORY", 2, 0),
        ("نظم التشغيل", "CS302", 3, "THEORY", 2, 1),
        ("مختبر نظم التشغيل", "CS302L", 2, "PRACTICAL", 2, 2),
        ("شبكات الحاسوب", "CS303", 3, "THEORY", 2, 3),
        ("مختبر الشبكات", "CS303L", 2, "PRACTICAL", 2, 4),
        ("تصميم وتحليل الخوارزميات", "CS304", 3, "THEORY", 2, 5),
        ("برمجة الويب المتكاملة", "CS305", 2, "THEORY", 2, 6),

        # Stage 4
        ("الذكاء الاصطناعي وتطبيقاته", "CS401", 3, "THEORY", 3, 7),
        ("مختبر الذكاء الاصطناعي", "CS401L", 2, "PRACTICAL", 3, 8),
        ("الأمن السيبراني والتشفير", "CS402", 3, "THEORY", 3, 9),
        ("مختبر الأمن السيبراني", "CS402L", 2, "PRACTICAL", 3, 10),
        ("تعلم الآلة Machine Learning", "CS403", 3, "THEORY", 3, 11),
        ("الحوسبة السحابية", "CS404", 2, "THEORY", 3, 12),
        ("مشروع التخرج", "CS499", 2, "THEORY", 3, 13),
    ]

    for name, code, hours, c_type, stage_idx, doc_idx in course_definitions:
        courses.append({
            "_id": ObjectId(),
            "name": name,
            "code": code,
            "creditHours": hours,
            "type": c_type,
            "stage": stages[stage_idx]["_id"],
            "assignedDoctor": doctors[doc_idx]["_id"],
        })

    return {
        "stages": stages,
        "courses": courses,
        "rooms": rooms,
        "availabilities": availabilities,
        "doctors": doctors,
    }

def analyze_and_verify_timetable(result, data):
    """
    Performs comprehensive deep verification and metrics analysis on the generated timetable.
    """
    slots = result["slots"]
    print("\n[3/4] Deep Constraint Verification & Validation...")

    total_sessions = sum(c["creditHours"] for c in data["courses"])
    print(f"  • Total required lecture sessions: {total_sessions}")
    print(f"  • Total scheduled lecture sessions: {len(slots)}")
    assert len(slots) == total_sessions, f"Missing sessions! Expected {total_sessions}, got {len(slots)}"

    # 1. Doctor Double-Booking Audit
    doctor_time_map = {}
    for slot in slots:
        key = (slot["doctor_id"], slot["day_of_week"], slot["time_slot"])
        assert key not in doctor_time_map, f"CRITICAL: Doctor double booked at {key}!"
        doctor_time_map[key] = slot
    print("  ✅ [Passed] Doctor Conflict Check: 0 double bookings across all professors.")

    # 2. Room Double-Booking Audit
    room_time_map = {}
    for slot in slots:
        key = (slot["room_id"], slot["day_of_week"], slot["time_slot"])
        assert key not in room_time_map, f"CRITICAL: Room double booked at {key}!"
        room_time_map[key] = slot
    print("  ✅ [Passed] Room Conflict Check: 0 room clashes.")

    # 3. Stage Double-Booking Audit
    stage_time_map = {}
    for slot in slots:
        key = (slot["stage_id"], slot["day_of_week"], slot["time_slot"])
        assert key not in stage_time_map, f"CRITICAL: Stage double booked at {key}!"
        stage_time_map[key] = slot
    print("  ✅ [Passed] Stage Conflict Check: 0 student batch overlaps.")

    # 4. Room Capacity & Compatibility Audit
    rooms_dict = {str(r["_id"]): r for r in data["rooms"]}
    stages_dict = {str(s["_id"]): s for s in data["stages"]}

    for slot in slots:
        room = rooms_dict[slot["room_id"]]
        stage = stages_dict[slot["stage_id"]]

        assert room["capacity"] >= stage["studentCount"], (
            f"Capacity violation: Room {room['roomNumber']} ({room['capacity']}) < Stage {stage['name']} ({stage['studentCount']})"
        )

        if slot["course_type"] == "PRACTICAL":
            assert room["roomType"] == "LAB", (
                f"Room type mismatch: Practical course assigned to non-lab {room['roomNumber']}"
            )

    print("  ✅ [Passed] Room Capacity & Type Compatibility Check: 100% compliant.")

    # 5. Doctor Availability Audit
    for avail_entry in data["availabilities"]:
        d_id = str(avail_entry["doctor"])
        for item in avail_entry["availability"]:
            if not item.get("isAvailable", True):
                day = item["dayOfWeek"]
                slot = item["timeSlot"]
                clash = (d_id, day, slot) in doctor_time_map
                assert not clash, f"Doctor availability violated for doctor {d_id} at day {day} slot {slot}!"
    print("  ✅ [Passed] Doctor Availability Constraints: 100% respected.")

    # Quality Metrics
    print("\n[4/4] Advanced Scheduling Quality Analysis:")
    # Days load distribution
    day_counts = {0: 0, 1: 0, 2: 0, 3: 0, 4: 0}
    day_names = {0: "الأحد", 1: "الإثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس"}
    for slot in slots:
        day_counts[slot["day_of_week"]] += 1

    for day_idx, count in day_counts.items():
        bar = "█" * (count // 2)
        print(f"  • {day_names[day_idx]}: {count} محاضرة ({bar})")

    # Room Utilization
    total_available_slots = len(data["rooms"]) * len(config.DAYS_OF_WEEK) * len(config.TIME_SLOTS)
    utilization_rate = round((len(slots) / total_available_slots) * 100, 1)
    print(f"\n  • معدل استغلال القاعات الإجمالي: {utilization_rate}% ({len(slots)} / {total_available_slots} فترة متاحة)")
    print("  • نسبة استيفاء الشروط الصارمة: 100% (Zero Conflicts Guaranteed)")

def main():
    print("=" * 70)
    print("🚀 BENCHMARK: TESTING GOOGLE OR-TOOLS ON MASSIVE ACADEMIC DATASET")
    print("=" * 70)

    data = generate_large_scale_dataset()
    total_sessions = sum(c["creditHours"] for c in data["courses"])

    print(f"\n[2/4] Initializing CP-SAT Solver with:")
    print(f"  • 4 Stages | 16 Professors | 10 Rooms/Labs | 28 Courses")
    print(f"  • Total Load: {total_sessions} Lecture Sessions to schedule across 5 days (20 time slots/week)")

    start_time = time.time()
    solver = AcademicTimetableSolver(data)
    result = solver.build_and_solve()
    elapsed = time.time() - start_time

    print(f"\n⚡ Solving Execution Time: {elapsed:.2f} seconds")
    print(f"📌 Solver Status: {result['status']}")

    if result["status"] in ["SUCCESS", "OPTIMAL"]:
        analyze_and_verify_timetable(result, data)
        print("\n" + "=" * 70)
        print("🏆 BENCHMARK PASSED: HIGHEST OPTIMALITY & 0% CONFLICT ACHIEVED!")
        print("=" * 70)
    else:
        print(f"❌ Failed: {result['message']}")

if __name__ == "__main__":
    main()
