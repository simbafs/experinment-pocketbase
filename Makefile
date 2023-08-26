npm = pnpm

dev: 
	tmux split-window -h make frontendDev
	make backendDev

frontendDev:
	cd frontend && $(npm) run dev

backendDev:
	pocketbase serve

.PHONY: dev frontendDev backendDev
