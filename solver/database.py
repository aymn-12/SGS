from pymongo import MongoClient
from bson.objectid import ObjectId
import config

class Database:
    def __init__(self):
        self.client = MongoClient(config.MONGODB_URI)
        # Database name from URI or default
        db_name = config.MONGODB_URI.split("/")[-1].split("?")[0] or "sgs_timetable"
        self.db = self.client[db_name]

    def get_department_data(self, department, semester):
        """Fetch all courses, rooms, stages, and doctor availability for a department"""
        stages = list(self.db.stages.find({"department": department}))
        stage_ids = [s["_id"] for s in stages]

        courses = list(self.db.courses.find({"stage": {"$in": stage_ids}}))
        rooms = list(self.db.rooms.find({"isAvailable": True}))
        availabilities = list(self.db.doctoravailabilities.find({"semester": semester}))

        return {
            "stages": stages,
            "courses": courses,
            "rooms": rooms,
            "availabilities": availabilities,
        }

    def save_generated_slots(self, timetable_id, generated_slots):
        """Update timetable document with solved slots and change status to DRAFT"""
        formatted_slots = []
        for slot in generated_slots:
            formatted_slots.append({
                "_id": ObjectId(),
                "course": ObjectId(slot["course_id"]),
                "stage": ObjectId(slot["stage_id"]),
                "doctor": ObjectId(slot["doctor_id"]),
                "room": ObjectId(slot["room_id"]),
                "dayOfWeek": slot["day_of_week"],
                "timeSlot": slot["time_slot"],
                "type": slot["course_type"],
                "status": "ACTIVE",
            })

        self.db.timetables.update_one(
            {"_id": ObjectId(timetable_id)},
            {
                "$set": {
                    "slots": formatted_slots,
                    "status": "DRAFT",
                    "updatedAt": ObjectId().generation_time,
                }
            }
        )
        print(f"[Database] Successfully saved {len(formatted_slots)} slots to timetable {timetable_id}")
