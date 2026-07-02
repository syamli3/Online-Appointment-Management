# Online-Appointment-Management
Here's the quick version:

Unzip appointment-portal.zip
Open a terminal and go into the backend folder:

bash   cd appointment-portal/backend

Install dependencies:

bash   pip install -r requirements.txt

Start the server:

bash   uvicorn main:app --reload

Open your browser at http://127.0.0.1:8000

That's it — one command runs both frontend and backend together. The database (appointments.db) and 6 sample doctors are created automatically the first time you run it.
Bonus: API docs (auto-generated) are at http://127.0.0.1:8000/docs if you want to test endpoints directly.
