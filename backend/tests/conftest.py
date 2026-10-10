import os
import tempfile

# Must be set before the app imports settings: keep tests off the real history DB.
os.environ["DATABASE_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["PREDICTION_PROVIDER"] = "mock"
