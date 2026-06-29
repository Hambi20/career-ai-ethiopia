#!/bin/bash
while true; do
  echo "Starting dev server at $(date)" >> dev.log
  bun run dev >> dev.log 2>&1
  echo "Server exited at $(date)" >> dev.log
  sleep 2
done
