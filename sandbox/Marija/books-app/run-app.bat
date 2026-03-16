@echo off

echo Starting backend...

start cmd /k "cd backend\BookTrackerBackend\BookTrackerBackend && dotnet run"

echo Starting frontend...

start cmd /k "cd frontend\frontend-app && npm start"

echo.
echo Application starting...
echo Frontend: http://localhost:4200
echo Backend: https://localhost:7270/swagger

timeout /t 15
start http://localhost:4200