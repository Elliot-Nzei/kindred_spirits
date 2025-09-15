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