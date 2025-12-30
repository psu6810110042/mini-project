#### Configuration

You **must** create a `.env` file in the `server/` directory for the application to work.
```toml
DB_HOST=db 
DB_PORT=5432 
DB_USER=adminkhet 
DB_PASSWORD=khetgamerthailand 
DB_NAME=nestbin 

JWT_SECRET=super_secret_key_change_this
```
(Note: If running locally without Docker, change `DB_HOST` to `localhost`)

## How to Run

Make sure you have Docker Desktop/CLI installed. Run the following command in the **root directory** of the project:
`$ docker compose up`

This will start both the Backend (API) and the Frontend (React), along with the PostgreSQL database.

- **API URL:** `http://localhost:3000`
- **Frontend URL:** `http://localhost:5173`

## Default Admin Account

On the first run, the system automatically seeds a default administrator account:

- **Username:** `khetadmin`
- **Password:** `adminkhet123`

### Created By

Jirakorn Sukmee 6810110042
- Department of Computer Engineering, **Faculty of Engineering**, Prince of Songkla University

Manattee Vilairat 6810110275 
- Department of Computer Engineering, **Faculty of Engineering**, Prince of Songkla University
