import os
from dotenv import load_dotenv

load_dotenv()

# Database & Broker Settings
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/sgs_timetable")
REDIS_HOST = os.getenv("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
SOLVER_QUEUE_NAME = os.getenv("SOLVER_QUEUE_NAME", "timetable_solver_tasks")

# Standard Academic Timetable Dimensions
# Days of week: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday
DAYS_OF_WEEK = [0, 1, 2, 3, 4]
DAY_NAMES = {
    0: "الأحد (Sunday)",
    1: "الإثنين (Monday)",
    2: "الثلاثاء (Tuesday)",
    3: "الأربعاء (Wednesday)",
    4: "الخميس (Thursday)",
}

# Daily Time Slots
TIME_SLOTS = [
    "08:30-10:00",
    "10:15-11:45",
    "12:00-13:30",
    "13:45-15:15",
]

# Max solver search time limit in seconds
SOLVER_TIME_LIMIT_SECONDS = 30
