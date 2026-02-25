# Event Scheduler - Docker Guide

This document explains how to run the application dynamically using Docker, and how to upload it to a Git repository (like GitHub).

## Prerequisites
1. **Docker Desktop**: You must have Docker installed. Download it from [Docker's official website](https://www.docker.com/products/docker-desktop/) and install it. Make sure it is running.
2. **Git**: Download and install [Git](https://git-scm.com/downloads) if you don't already have it.

## 🚀 Running the Application with Docker

We have created a `docker-compose.yml` file that orchestrates three different services:
1. **MySQL Database**: Stores all your programmatic data.
2. **Backend (Python/FastAPI)**: Serves the API and handles business logic/AI tasks.
3. **Frontend (React)**: The beautiful web UI hosted via Nginx.

To spin everything up:

1. Open a terminal (Command Prompt, PowerShell, or Git Bash) inside the `Event-Scheduler` folder.
2. Run the following command:
   ```bash
   docker-compose up -d --build
   ```
   *Note: On newer Docker installations, the command might be `docker compose up -d --build` (without the hyphen).*

3. **Wait a minute or two**. The first time you run this, it will download necessary files and build the images.
4. **Access the Application**:
   - The Frontend Website will be available at: [http://localhost](http://localhost) (Port 80)
   - The Backend API will be available at: [http://localhost:8000](http://localhost:8000)
5. **To stop the application**:
   ```bash
   docker-compose down
   ```

## 📦 Pushing to Git (GitHub/GitLab)

If you want to save your progress and access this code from another device, you can push it to a cloud Git provider like GitHub.

1. **Create an account** on [GitHub](https://github.com/) and create a "New Repository". Name it something like `event-scheduler`. **Do not** initialize it with a README or .gitignore (leave it completely empty).
2. Open a terminal in your `Event-Scheduler` folder.
3. Initialize the Git repository locally:
   ```bash
   git init
   ```
4. Add all your files to be tracked by Git:
   ```bash
   git add .
   ```
5. Create your first commit (which freezes the state of the files locally):
   ```bash
   git commit -m "Initial commit with Docker integration"
   ```
6. Link your local folder to your online GitHub repository (replace `<YOUR_USERNAME>` with your GitHub username):
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/event-scheduler.git
   ```
7. Push the code up to the cloud!
   ```bash
   git branch -M main
   git push -u origin main
   ```

*Note: You may be prompted to log in to GitHub at this step. Follow the browser prompts to authenticate.*

### Running on Another Device
Once your code is pushed to GitHub, go to your second device:
1. Ensure Git and Docker are installed.
2. Clone the repository:
   ```bash
   git clone https://github.com/<YOUR_USERNAME>/event-scheduler.git
   ```
3. Change directory into the folder:
   ```bash
   cd event-scheduler
   ```
4. Start the application!
   ```bash
   docker-compose up -d --build
   ```
