
push:
	@echo "Adding all changes..."
	git add .
	@echo "Committing changes..."
	git commit
	@echo "Pushing to remote..."
	git push
	@echo "Done!"

.PHONY: push
