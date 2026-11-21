@echo off
echo Starting Seeding Process...
node seed.js > seed_report.txt 2>&1
echo Seeding Finished. Check seed_report.txt for details.
