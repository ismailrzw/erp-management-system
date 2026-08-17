"""Teacher/Evaluator constants — reuses UserFields since teachers live in the users collection."""


class TeacherType:
    INTERNAL = "Internal Faculty"
    EXTERNAL = "External Industry"
    ALL = [INTERNAL, EXTERNAL]