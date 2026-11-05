from celery import Celery
import json
import config
from database import Database
from timetable_solver import AcademicTimetableSolver

# Celery application
redis_url = f"redis://:{config.REDIS_PASSWORD or ''}@{config.REDIS_HOST}:{config.REDIS_PORT}/0"
app = Celery("timetable_tasks", broker=redis_url, backend=redis_url)

@app.task(name="tasks.solve_timetable")
def solve_timetable_task(timetable_id, department, semester, academic_year):
    db = Database()
    data = db.get_department_data(department, semester)

    solver = AcademicTimetableSolver(data)
    result = solver.build_and_solve()

    if result["status"] == "SUCCESS" and result["slots"]:
        db.save_generated_slots(timetable_id, result["slots"])

    return result
