import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from bson.objectid import ObjectId
from timetable_solver import AcademicTimetableSolver

def run_faulty_scenarios():
    print("=" * 75)
    print("🚨 TEST SUITE: اختبار سيناريوهات الجداول التي تحتوي على خلل وتعارضات")
    print("=" * 75)

    stage_id = ObjectId()
    doc_id = ObjectId()
    room_hall_id = ObjectId()
    room_lab_id = ObjectId()

    # -------------------------------------------------------------
    # السيناريو 1: خنق تفرغ الدكتور (طلب تدريس ساعات أكثر من تفرغه)
    # -------------------------------------------------------------
    print("\n[السيناريو 1]: الدكتور متاح ساعتين فقط في الأسبوع، لكن مطلوب منه تدريس 6 ساعات!")
    data_scenario_1 = {
        "stages": [{"_id": stage_id, "name": "المرحلة الأولى", "studentCount": 30}],
        "rooms": [{"_id": room_hall_id, "roomNumber": "قاعة 101", "roomType": "LECTURE_HALL", "capacity": 50, "isAvailable": True}],
        "courses": [{
            "_id": ObjectId(), "name": "البرمجة المتقدمة", "stage": stage_id,
            "assignedDoctor": doc_id, "type": "THEORY", "creditHours": 4  # يحتاج 4 فترات
        }],
        # الدكتور متاح في فترة واحدة فقط يوم الأحد ومعتذر عن باقي الأسبوع كله!
        "availabilities": [{
            "doctor": doc_id,
            "availability": [
                {"dayOfWeek": d, "timeSlot": slot, "isAvailable": False}
                for d in [0, 1, 2, 3, 4] for slot in ["08:30-10:00", "10:15-11:45", "12:00-13:30", "13:45-15:15"]
                if not (d == 0 and slot == "08:30-10:00")  # متاح فترة واحدة فقط
            ]
        }]
    }

    solver1 = AcademicTimetableSolver(data_scenario_1)
    res1 = solver1.build_and_solve()
    print(f"  • استجابة النظام: {res1['status']}")
    print(f"  • التشخيص الذكي: ❌ {res1['message']}")
    assert res1["status"] == "INFEASIBLE", "يجب أن يفشل النظام ويرفض الجدول لوجود استحالة رياضية"

    # -------------------------------------------------------------
    # السيناريو 2: سعة القاعة أصغر من عدد طلاب المرحلة
    # -------------------------------------------------------------
    print("\n[السيناريو 2]: مرحلة فيها 80 طالباً، وأكبر قاعة متاحة سعتها 40 طالباً فقط!")
    data_scenario_2 = {
        "stages": [{"_id": stage_id, "name": "المرحلة الرابعة (مزدحمة)", "studentCount": 80}],
        "rooms": [
            {"_id": ObjectId(), "roomNumber": "قاعة صغيرة 1", "roomType": "LECTURE_HALL", "capacity": 40, "isAvailable": True},
            {"_id": ObjectId(), "roomNumber": "قاعة صغيرة 2", "roomType": "LECTURE_HALL", "capacity": 35, "isAvailable": True},
        ],
        "courses": [{
            "_id": ObjectId(), "name": "مشروع التخرج", "stage": stage_id,
            "assignedDoctor": doc_id, "type": "THEORY", "creditHours": 2
        }],
        "availabilities": []
    }

    solver2 = AcademicTimetableSolver(data_scenario_2)
    res2 = solver2.build_and_solve()
    print(f"  • استجابة النظام: {res2['status']}")
    print(f"  • التشخيص الذكي: ❌ {res2['message']}")
    assert res2["status"] == "INFEASIBLE"

    # -------------------------------------------------------------
    # السيناريو 3: مادة عملية بدون وجود أي مختبر
    # -------------------------------------------------------------
    print("\n[السيناريو 3]: مادة عملي (تتطلب مختبر حاسوب LAB)، لكن كل القاعات المتوفرة مدرجات عادية!")
    data_scenario_3 = {
        "stages": [{"_id": stage_id, "name": "المرحلة الثانية", "studentCount": 30}],
        "rooms": [
            {"_id": ObjectId(), "roomNumber": "مدرج كبير", "roomType": "LECTURE_HALL", "capacity": 100, "isAvailable": True},
        ],
        "courses": [{
            "_id": ObjectId(), "name": "مختبر شبكات الحاسوب (عملي)", "stage": stage_id,
            "assignedDoctor": doc_id, "type": "PRACTICAL", "creditHours": 2
        }],
        "availabilities": []
    }

    solver3 = AcademicTimetableSolver(data_scenario_3)
    res3 = solver3.build_and_solve()
    print(f"  • استجابة النظام: {res3['status']}")
    print(f"  • التشخيص الذكي: ❌ {res3['message']}")
    assert res3["status"] == "INFEASIBLE"

    # -------------------------------------------------------------
    # السيناريو 4: اختناق القاعات (Pigeonhole Principle Overload)
    # -------------------------------------------------------------
    print("\n[السيناريو 4]: مطلوب جدولة 25 محاضرة في الأسبوع، لكن لا تتوفر إلا قاعة واحدة فقط (أقصى سعة لها 20 فترة)!")
    data_scenario_4 = {
        "stages": [{"_id": stage_id, "name": "المرحلة الأولى", "studentCount": 30}],
        # قاعة واحدة أقصى استيعاب لها 5 أيام × 4 فترات = 20 فترة فقط!
        "rooms": [{"_id": ObjectId(), "roomNumber": "قاعة وحيدة", "roomType": "LECTURE_HALL", "capacity": 50, "isAvailable": True}],
        "courses": [
            # 6 مواد × 4 ساعات = 24 ساعة (أكثر من الطاقة الاستيعابية للقاعة الوحيدة)
            {"_id": ObjectId(), "name": f"مادة رقم {i}", "stage": stage_id, "assignedDoctor": ObjectId(), "type": "THEORY", "creditHours": 4}
            for i in range(1, 7)
        ],
        "availabilities": []
    }

    solver4 = AcademicTimetableSolver(data_scenario_4)
    res4 = solver4.build_and_solve()
    print(f"  • استجابة النظام: {res4['status']}")
    print(f"  • التشخيص الذكي: ❌ {res4['message']}")
    assert res4["status"] == "INFEASIBLE"

    print("\n" + "=" * 75)
    print("🛡️ النتيجة: النظام اكتشف ومنع جميع الحالات المعطوبة بنسبة 100% وأعطى رسائل تشخيص دقيقة!")
    print("=" * 75)

if __name__ == "__main__":
    run_faulty_scenarios()
