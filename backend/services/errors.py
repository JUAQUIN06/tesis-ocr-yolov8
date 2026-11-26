class ProcessingError(Exception):
    def __init__(self, message: str, status_code: int = 422, code: str = "invalid_document"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
