-- Tests wipe tables between runs, so they get their own database
-- and never touch your demo data in "kiosk".
CREATE DATABASE kiosk_test;
