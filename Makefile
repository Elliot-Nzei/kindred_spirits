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

clean:
	@echo "Cleaning user-generated content..."
	-del /Q uploads\posts\*
	-del /Q uploads\profiles\*
	@echo '{"comments": []}' > data\comments.json
	@echo '[]' > data\notifications.json
	@echo "Done!"

.PHONY: clean

delete-db:
	@echo "Requesting backend to delete sql_app.db..."
	curl -X DELETE http://127.0.0.1:8000/api/dev/delete-db

.PHONY: delete-db