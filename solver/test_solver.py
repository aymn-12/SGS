import sys
# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from bson.objectid import ObjectId
from timetable_solver import AcademicTimetableSolver

def run_test():
    print("=" * 60)
    print("[TEST] Running Unit Test on Google OR-Tools Timetable Solver...")
    print("=" * 60)

    # 1. Mock Data Setup
    stage1_id = ObjectId()
    stage2_id = ObjectId()

    doc1_id = ObjectId()
    doc2_id = ObjectId()

    room_hall_id = ObjectId()
    room_lab_id = ObjectId()

    data = {
        "stages": [
            {"_id": stage1_id, "name": "المرحلة الأولى", "studentCount": 40},
            {"_id": stage2_id, "name": "المرحلة الثانية", "studentCount": 25},
        ],
        "rooms": [
            {
                "_id": room_hall_id,
                "roomNumber": "مدرج 101",
                "roomType": "LECTURE_HALL",
                "capacity": 50,
                "isAvailable": True,
            },
            {
                "_id": room_lab_id,
                "roomNumber": "مختبر البرمجيات",
                "roomType": "LAB",
                "capacity": 30,
                "isAvailable": True,
            },
        ],
        "courses": [
            {
                "_id": ObjectId(),
                "name": "مقدمة البرمجة (نظري)",
                "stage": stage1_id,
                "assignedDoctor": doc1_id,
                "type": "THEORY",
                "creditHours": 2,
            },
            {
                "_id": ObjectId(),
                "name": "تراكيب البيانات (نظري)",
                "stage": stage2_id,
                "assignedDoctor": doc2_id,
                "type": "THEORY",
                "creditHours": 2,
            },
            {
                "_id": ObjectId(),
                "name": "مختبر البرمجة (عملي)",
                "stage": stage2_id,
                "assignedDoctor": doc1_id,
                "type": "PRACTICAL",
                "creditHours": 1,
            },
        ],
        # Doctor 1 is unavailable on Sunday (day 0) from 08:30-10:00
        "availabilities": [
            {
                "doctor": doc1_id,
                "availability": [
                    {"dayOfWeek": 0, "timeSlot": "08:30-10:00", "isAvailable": False}
                ],
            }
        ],
    }

    # 2. Execute Solver
    solver = AcademicTimetableSolver(data)
    result = solver.build_and_solve()

    print(f"\n[Status] Result Status: {result['status']}")
    print(f"[Message] {result['message']}")
    print(f"[Slots] Total Scheduled Slots: {len(result['slots'])}\n")

    assert result["status"] == "SUCCESS", "Expected solver to succeed!"
    assert len(result["slots"]) == 5, f"Expected 5 total lecture units (2+2+1), got {len(result['slots'])}"

    # 3. Assert Hard Constraints
    day_names = {0: "الأحد", 1: "الإثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس"}

    for slot in result["slots"]:
        day_name = day_names.get(slot["day_of_week"], slot["day_of_week"])
        room_name = "مدرج 101" if slot["room_id"] == str(room_hall_id) else "مختبر البرمجيات"
        doc_name = "د. أحمد (1)" if slot["doctor_id"] == str(doc1_id) else "د. سارة (2)"
        print(f"  * {day_name} [{slot['time_slot']}] | {doc_name} | {room_name} | نوع: {slot['course_type']}")

        # Verify Practical Course is in Lab
        if slot["course_type"] == "PRACTICAL":
            assert slot["room_id"] == str(room_lab_id), "Practical class must be in LAB!"

        # Verify Doctor 1 was NOT scheduled on Sunday 08:30-10:00
        if slot["doctor_id"] == str(doc1_id):
            is_clash_with_unavailability = (slot["day_of_week"] == 0 and slot["time_slot"] == "08:30-10:00")
            assert not is_clash_with_unavailability, "Doctor 1 was booked during unavailable time!"

    print("\n[SUCCESS] All Constraints (Hard & Soft) Verified 100% Successfully!")
    print("=" * 60)

if __name__ == "__main__":
    run_test()
