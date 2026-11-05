import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import json
import time
import redis
from database import Database
from timetable_solver import AcademicTimetableSolver
import config

def start_worker():
    print(f"🚀 [Python Solver Worker] Starting...")
    print(f"🔗 Connecting to Redis: {config.REDIS_HOST}:{config.REDIS_PORT} (Queue: {config.SOLVER_QUEUE_NAME})")

    r = redis.Redis(
        host=config.REDIS_HOST,
        port=config.REDIS_PORT,
        password=config.REDIS_PASSWORD,
        decode_responses=True,
    )

    db = Database()
    print("✅ [Python Solver Worker] Connected and waiting for scheduling tasks...")

    while True:
        try:
            # Blocking pop from Redis list (waits until a task arrives)
            item = r.brpop(config.SOLVER_QUEUE_NAME, timeout=5)
            if item is None:
                continue

            _, task_json = item
            task_data = json.loads(task_json)

            task_id = task_data.get("taskId")
            timetable_id = task_data.get("timetableId")
            department = task_data.get("department")
            semester = task_data.get("semester")

            print(f"\n⚡ [Worker] Received task {task_id} for Dept: '{department}', Semester: '{semester}'")

            start_time = time.time()

            # 1. Fetch data from MongoDB
            data = db.get_department_data(department, semester)
            print(f"📥 Fetched {len(data['courses'])} courses, {len(data['rooms'])} rooms, {len(data['stages'])} stages")

            # 2. Run Google OR-Tools CP-SAT Solver
            solver = AcademicTimetableSolver(data)
            result = solver.build_and_solve()

            elapsed = round(time.time() - start_time, 2)
            print(f"⏱️ Solving completed in {elapsed}s with status: {result['status']}")

            # 3. Save slots to MongoDB if successful
            if result["status"] == "SUCCESS" and result["slots"]:
                db.save_generated_slots(timetable_id, result["slots"])
                print(f"💾 Saved {len(result['slots'])} slots to MongoDB for timetable {timetable_id}")
            else:
                print(f"⚠️ Solving issue: {result['message']}")

            # 4. Notify Node.js via Redis Pub/Sub
            notification_payload = json.dumps({
                "taskId": task_id,
                "timetableId": timetable_id,
                "status": result["status"],
                "message": result["message"],
                "slotsCount": len(result["slots"]),
                "elapsedSeconds": elapsed,
            })
            r.publish("timetable_channel", notification_payload)

        except redis.ConnectionError:
            print("❌ [Worker] Redis connection failed, retrying in 5 seconds...")
            time.sleep(5)
        except Exception as e:
            print(f"❌ [Worker Error] Unexpected error: {str(e)}")
            time.sleep(1)

if __name__ == "__main__":
    start_worker()
