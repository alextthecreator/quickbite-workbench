from course_app.app import checks, ROOT
from course_app.validation import validate_course
print(validate_course(ROOT))
print(checks())
