-- ============================================================
-- Four Corners: Snowflake setup (synthetic data only)
-- Paste into a Snowsight SQL worksheet and run all.
-- ============================================================
USE ROLE ACCOUNTADMIN;

CREATE WAREHOUSE IF NOT EXISTS FC_WH
  WAREHOUSE_SIZE = 'XSMALL' AUTO_SUSPEND = 60 AUTO_RESUME = TRUE INITIALLY_SUSPENDED = TRUE;
CREATE DATABASE IF NOT EXISTS FOURCORNERS;
CREATE SCHEMA IF NOT EXISTS FOURCORNERS.APP;
USE WAREHOUSE FC_WH;
USE SCHEMA FOURCORNERS.APP;

-- ------------------------------------------------------------
-- 1. The four friends (original characters, four cities)
-- ------------------------------------------------------------
CREATE OR REPLACE TABLE FRIENDS (
  FRIEND_ID INT, NAME STRING, CITY STRING,
  LAT FLOAT, LON FLOAT, COLOR STRING, TRAIT STRING
);
INSERT INTO FRIENDS VALUES
  (1, 'Arlo',  'Seattle',  47.6062, -122.3321, 'blue',   'the steady one'),
  (2, 'Beck',  'Austin',   30.2672,  -97.7431, 'orange', 'the adventurer'),
  (3, 'Cyrus', 'Chicago',  41.8781,  -87.6298, 'green',  'the foodie'),
  (4, 'Dante', 'Atlanta',  33.7490,  -84.3880, 'purple', 'the quiet one');

-- ------------------------------------------------------------
-- 2. Candidate meeting cities
-- ------------------------------------------------------------
CREATE OR REPLACE TABLE CITIES (CITY STRING, LAT FLOAT, LON FLOAT);
INSERT INTO CITIES VALUES
  ('Seattle',      47.6062, -122.3321),
  ('Austin',       30.2672,  -97.7431),
  ('Chicago',      41.8781,  -87.6298),
  ('Atlanta',      33.7490,  -84.3880),
  ('Denver',       39.7392, -104.9903),
  ('Nashville',    36.1627,  -86.7816),
  ('Kansas City',  39.0997,  -94.5786),
  ('New Orleans',  29.9511,  -90.0715),
  ('Minneapolis',  44.9778,  -93.2650),
  ('St. Louis',    38.6270,  -90.1994),
  ('Dallas',       32.7767,  -96.7970);

-- Synthetic travel model: hours and cost grow with distance (no live flight data)
CREATE OR REPLACE VIEW TRAVEL_LEGS AS
SELECT f.FRIEND_ID, f.NAME, c.CITY AS DEST_CITY,
       HAVERSINE(f.LAT, f.LON, c.LAT, c.LON) AS KM,
       IFF(HAVERSINE(f.LAT, f.LON, c.LAT, c.LON) < 50, 0,
           1.5 + HAVERSINE(f.LAT, f.LON, c.LAT, c.LON) / 700) AS HOURS,
       IFF(HAVERSINE(f.LAT, f.LON, c.LAT, c.LON) < 50, 0,
           ROUND(80 + 0.12 * HAVERSINE(f.LAT, f.LON, c.LAT, c.LON), 0)) AS COST_USD
FROM FRIENDS f CROSS JOIN CITIES c;

-- ------------------------------------------------------------
-- 3. Availability: next 20 Saturdays; each friend free ~60% of them.
--    Weekends 3, 7 and 11 are forced free for everyone so the demo works.
-- ------------------------------------------------------------
CREATE OR REPLACE TABLE FREE_WEEKENDS (FRIEND_ID INT, WEEKEND_START DATE);
INSERT INTO FREE_WEEKENDS
SELECT f.FRIEND_ID, DATEADD(week, w.N, '2026-10-31'::DATE)
FROM FRIENDS f
CROSS JOIN (SELECT SEQ4() AS N FROM TABLE(GENERATOR(ROWCOUNT => 20))) w
WHERE MOD(ABS(HASH(f.FRIEND_ID, w.N)), 100) < 60
   OR w.N IN (3, 7, 11);

CREATE OR REPLACE VIEW ALL_FREE_WEEKENDS AS
SELECT WEEKEND_START FROM FREE_WEEKENDS
GROUP BY WEEKEND_START HAVING COUNT(DISTINCT FRIEND_ID) = 4;

-- ------------------------------------------------------------
-- 4. Synthetic history of 500 group trips, and whether they happened.
--    Prototype only: outcomes are generated from a rule, not real behavior.
-- ------------------------------------------------------------
CREATE OR REPLACE TABLE PAST_TRIPS AS
WITH base AS (
  SELECT SEQ4() AS ID,
         3 + MOD(ABS(HASH(SEQ4(), 'g')), 4)              AS GROUP_SIZE,
         1 + MOD(ABS(HASH(SEQ4(), 'n')), 5)              AS NIGHTS,
         1 + MOD(ABS(HASH(SEQ4(), 't')), 12)             AS MAX_TRAVEL_HOURS,
         100 + MOD(ABS(HASH(SEQ4(), 'c')), 800)          AS EST_COST_PP,
         7 + MOD(ABS(HASH(SEQ4(), 'l')), 114)            AS LEAD_TIME_DAYS
  FROM TABLE(GENERATOR(ROWCOUNT => 500))
), scored AS (
  SELECT *,
         1 / (1 + EXP(-(1.8 - 0.25 * MAX_TRAVEL_HOURS - 0.002 * EST_COST_PP
                        - 0.15 * GROUP_SIZE + 0.012 * LEAST(LEAD_TIME_DAYS, 60)
                        - 0.12 * NIGHTS))) AS P
  FROM base
)
SELECT ID, GROUP_SIZE, NIGHTS, MAX_TRAVEL_HOURS, EST_COST_PP, LEAD_TIME_DAYS,
       (MOD(ABS(HASH(ID, 'o')), 1000) / 1000.0) < P AS HAPPENED
FROM scored;

-- ------------------------------------------------------------
-- 5. Trip Survival Score (0 to 1). Logistic prototype, same shape as the data.
--    Stretch goal: replace with SNOWFLAKE.ML.CLASSIFICATION trained on PAST_TRIPS.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION SURVIVAL_SCORE(
  GROUP_SIZE FLOAT, NIGHTS FLOAT, MAX_TRAVEL_HOURS FLOAT,
  EST_COST_PP FLOAT, LEAD_TIME_DAYS FLOAT)
RETURNS FLOAT
AS
$$
  1 / (1 + EXP(-(1.8 - 0.25 * MAX_TRAVEL_HOURS - 0.002 * EST_COST_PP
                 - 0.15 * GROUP_SIZE + 0.012 * LEAST(LEAD_TIME_DAYS, 60)
                 - 0.12 * NIGHTS)))
$$;

-- ------------------------------------------------------------
-- 6. Ranked plans: every all-four-free weekend x every candidate city
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW PLAN_OPTIONS AS
WITH legs AS (
  SELECT DEST_CITY,
         MAX(HOURS)    AS MAX_HOURS,
         AVG(COST_USD) AS AVG_COST,
         MAX(COST_USD) - MIN(COST_USD) AS COST_GAP
  FROM TRAVEL_LEGS GROUP BY DEST_CITY
)
SELECT w.WEEKEND_START, l.DEST_CITY,
       ROUND(l.MAX_HOURS, 1) AS MAX_TRAVEL_HOURS,
       ROUND(l.AVG_COST)     AS EST_COST_PP,
       ROUND(l.COST_GAP)     AS COST_GAP,
       DATEDIFF(day, CURRENT_DATE(), w.WEEKEND_START) AS LEAD_DAYS,
       ROUND(SURVIVAL_SCORE(4, 2, l.MAX_HOURS, l.AVG_COST,
             DATEDIFF(day, CURRENT_DATE(), w.WEEKEND_START)), 2) AS SURVIVAL
FROM ALL_FREE_WEEKENDS w CROSS JOIN legs l;

-- ------------------------------------------------------------
-- 7. Sanity checks: run these and eyeball the results
-- ------------------------------------------------------------
-- SELECT * FROM ALL_FREE_WEEKENDS ORDER BY 1;                 -- expect at least 3 rows
-- SELECT * FROM PLAN_OPTIONS ORDER BY SURVIVAL DESC LIMIT 5;  -- best plans
-- SELECT AVG(HAPPENED::INT) FROM PAST_TRIPS;                  -- overall base rate
