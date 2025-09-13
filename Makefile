
run-backend:
	@echo "Starting FastAPI backend..."
	backend\venv\Scripts\uvicorn backend.main:app --reload

.PHONY: run-backend

push:
	@echo "Adding all changes..."
	git add .
	@echo "Committing changes..."
	git commit
	@echo "Pushing to remote..."
	git push
	@echo "Done!"

.PHONY: push

