-- Forward-only input hardening. Existing rows are never rewritten, hidden or inferred.
-- NOT VALID protects future INSERT/UPDATE operations while preserving historical rows.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.valid_day_array(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare total integer; distinct_total integer;
begin
  if jsonb_typeof(value) <> 'array' or jsonb_array_length(value) > 7 then return false; end if;
  if exists (
    select 1 from jsonb_array_elements(value) item
    where jsonb_typeof(item) <> 'string'
       or trim(both '"' from item::text) not in ('Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo')
  ) then return false; end if;
  select count(*), count(distinct item) into total, distinct_total from jsonb_array_elements_text(value) item;
  return total = distinct_total;
exception when others then return false;
end $$;

create or replace function private.valid_equipment(value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  return jsonb_typeof(value) = 'object'
    and value ?& array['skiErg','rowErg','bikeErg','assaultBike','sled','wallBall','sandbag','kettlebells','dumbbells','barbellAndPlates','treadmill','runningSpace','plyoBox']
    and (select count(*) from jsonb_object_keys(value)) = 13
    and not exists (select 1 from jsonb_each(value) item where jsonb_typeof(item.value) <> 'boolean');
exception when others then return false;
end $$;

create or replace function private.valid_duration_text(value text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare parts text[]; hours integer := 0; minutes integer; seconds numeric; total numeric;
begin
  if value !~ '^(?:[0-9]{1,2}:)?[0-9]{1,2}:[0-9]{2}(?:\.[0-9]{1,3})?$' then return false; end if;
  parts := string_to_array(value, ':');
  if array_length(parts,1) = 3 then hours := parts[1]::integer; minutes := parts[2]::integer; seconds := parts[3]::numeric;
  else minutes := parts[1]::integer; seconds := parts[2]::numeric; end if;
  total := hours * 3600 + minutes * 60 + seconds;
  return minutes < 60 and seconds < 60 and total between 1 and 21600;
exception when others then return false;
end $$;

create or replace function private.valid_pace_text(value text)
returns boolean language sql immutable set search_path = '' as $$
  select value ~ '^(?:0[2-9]|1[0-4]):[0-5][0-9]$|^15:00$';
$$;

create or replace function private.valid_training_test_result(test_id text, value jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare allowed text[]; required text[]; key text; raw jsonb; numeric_value numeric;
begin
  if jsonb_typeof(value) <> 'object' then return false; end if;
  case test_id
    when 'erg-power' then allowed:=array['ergometer','protocolSeconds','maxWatts','averageWatts','calories','damper','notes']; required:=array['ergometer','protocolSeconds','maxWatts','averageWatts'];
    when 'ski-2k' then allowed:=array['totalTime','damper','averageHr','maxHr','notes']; required:=array['totalTime','damper'];
    when 'row-2k' then allowed:=array['totalTime','damper','averageHr','maxHr','strokeRate','notes']; required:=array['totalTime','damper'];
    when 'vam' then allowed:=array['protocol','distanceMeters','totalTime','averageHr','maxHr','notes']; required:=array['protocol','distanceMeters','totalTime'];
    when 'run-10k' then allowed:=array['totalTime','averageHr','maxHr','elevationMeters','temperatureC','notes']; required:=array['totalTime'];
    when 'sled-push-sprint','sled-pull-sprint' then allowed:=array['loadKg','distanceMeters','totalTime','surface','notes']; required:=array['loadKg','distanceMeters','totalTime'];
    when 'sled-push-max','sled-pull-max' then allowed:=array['maxLoadKg','distanceMeters','totalTime','surface','validExecution','notes']; required:=array['maxLoadKg','distanceMeters','surface','validExecution'];
    when 'bike-ftp-20' then allowed:=array['averageWatts','averageHr','maxHr','cadence','damper','notes']; required:=array['averageWatts','averageHr'];
    when 'jim-vance-30' then allowed:=array['blockMinutes','distanceMeters','averagePace','last20AverageHr','maxHr','notes']; required:=array['blockMinutes','distanceMeters','averagePace','last20AverageHr'];
    else return false;
  end case;
  if exists (select 1 from jsonb_object_keys(value) k where not (k = any(allowed)))
     or exists (select 1 from unnest(required) k where not value ? k or value->k in ('null'::jsonb,'""'::jsonb)) then return false; end if;
  for key, raw in select * from jsonb_each(value) loop
    if raw in ('null'::jsonb,'""'::jsonb) then continue; end if;
    if key in ('protocolSeconds','maxWatts','averageWatts','averageHr','maxHr','last20AverageHr','damper','cadence','strokeRate','distanceMeters','loadKg','maxLoadKg','temperatureC','blockMinutes','calories','elevationMeters') then
      if jsonb_typeof(raw) <> 'number' then return false; end if;
      numeric_value := (raw#>>'{}')::numeric;
      if (key='protocolSeconds' and (numeric_value not between 1 and 3600 or mod(numeric_value,1)<>0))
        or (key in ('maxWatts','averageWatts') and (numeric_value not between 1 and 3000 or mod(numeric_value,1)<>0))
        or (key in ('averageHr','maxHr','last20AverageHr') and (numeric_value not between 25 and 240 or mod(numeric_value,1)<>0))
        or (key='damper' and (numeric_value not between 1 and 10 or mod(numeric_value,1)<>0))
        or (key in ('cadence','strokeRate') and (numeric_value not between 10 and 250 or mod(numeric_value,1)<>0))
        or (key='distanceMeters' and (numeric_value not between 1 and 15000 or case when test_id like 'sled-%' then mod(numeric_value*10,1)<>0 else mod(numeric_value,1)<>0 end))
        or (key in ('loadKg','maxLoadKg') and (numeric_value not between 1 and 500 or mod(numeric_value*2,1)<>0))
        or (key='temperatureC' and (numeric_value not between -30 and 60 or mod(numeric_value*10,1)<>0))
        or (key='blockMinutes' and (numeric_value<>30 or mod(numeric_value,1)<>0))
        or (key in ('calories','elevationMeters') and (numeric_value not between 0 and 10000 or mod(numeric_value,1)<>0)) then return false; end if;
    elsif key='totalTime' and (jsonb_typeof(raw)<>'string' or not private.valid_duration_text(raw#>>'{}')) then return false;
    elsif key='averagePace' and (jsonb_typeof(raw)<>'string' or not private.valid_pace_text(raw#>>'{}')) then return false;
    elsif key='ergometer' and raw#>>'{}' not in ('SkiErg','RowErg','BikeErg','Assault Bike') then return false;
    elsif key='validExecution' and jsonb_typeof(raw)<>'boolean' then return false;
    elsif key in ('surface','protocol') and (jsonb_typeof(raw)<>'string' or length(trim(raw#>>'{}')) not between 1 and 500) then return false;
    elsif key='notes' and (jsonb_typeof(raw)<>'string' or length(trim(raw#>>'{}'))>1000) then return false;
    end if;
  end loop;
  if (value ? 'averageHr' and value ? 'maxHr' and (value->>'averageHr')::numeric > (value->>'maxHr')::numeric)
    or (value ? 'last20AverageHr' and value ? 'maxHr' and (value->>'last20AverageHr')::numeric > (value->>'maxHr')::numeric)
    or (value ? 'averageWatts' and value ? 'maxWatts' and (value->>'averageWatts')::numeric > (value->>'maxWatts')::numeric) then return false; end if;
  return true;
exception when others then return false;
end $$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.valid_day_array(jsonb), private.valid_equipment(jsonb), private.valid_duration_text(text), private.valid_pace_text(text), private.valid_training_test_result(text,jsonb) to authenticated;

-- Aggregate, no-PII cleanup inventory. It reports counts and never blocks this migration.
create or replace function private.input_domain_preflight()
returns jsonb language sql stable set search_path = '' as $$
select jsonb_build_object(
  'profiles', (select count(*) from public.profiles where not (
    (height_cm is null or (height_cm between 120 and 230 and mod(height_cm,1)=0)) and
    (weight_kg is null or (weight_kg between 35 and 250 and mod(weight_kg*2,1)=0)) and
    (sex is null or sex in ('female','male','other')) and
    (hyrox_category='' or hyrox_category in ('women_open','men_open','women_pro','men_pro','doubles_women','doubles_men','doubles_mixed','doubles_women_pro','doubles_men_pro','relay_women','relay_men','relay_mixed')) and length(name)<=500)),
  'metrics', (select count(*) from public.athlete_metrics where not (
    (resting_hr_baseline is null or (resting_hr_baseline between 25 and 240 and mod(resting_hr_baseline,1)=0)) and
    (resting_hr_today is null or (resting_hr_today between 25 and 240 and mod(resting_hr_today,1)=0)) and
    (max_hr is null or (max_hr between 25 and 240 and mod(max_hr,1)=0)) and
    (lthr is null or (lthr between 25 and 240 and mod(lthr,1)=0)) and
    (hrv_baseline is null or (hrv_baseline between 1 and 500 and mod(hrv_baseline,1)=0)) and
    (current_running_volume_km is null or (current_running_volume_km between 0 and 300 and mod(current_running_volume_km*2,1)=0)) and
    (current_long_run_km is null or (current_long_run_km between 0 and 100 and mod(current_long_run_km*2,1)=0)) and
    (current_running_volume_km is null or current_long_run_km is null or current_long_run_km<=current_running_volume_km) and
    hyrox_experience in ('','primera vez','1-2 carreras','3+ carreras') and strength_experience in ('','baja','media','alta') and
    (rftp='' or private.valid_pace_text(rftp)) and (z2_pace_low='' or private.valid_pace_text(z2_pace_low)) and
    (z2_pace_high='' or private.valid_pace_text(z2_pace_high)) and (five_k_pace='' or private.valid_pace_text(five_k_pace)) and
    (ten_k_pace='' or private.valid_pace_text(ten_k_pace)) and (lthr is null or max_hr is null or lthr<=max_hr))),
  'availability', (select count(*) from public.athlete_availability where not (
    private.valid_day_array(available_days) and preferred_training_time in ('','mañana','mediodía','tarde','noche') and
    (max_session_minutes is null or (max_session_minutes between 15 and 360 and mod(max_session_minutes,5)=0)) and
    (min_hours_between_sessions is null or (min_hours_between_sessions between 1 and 24 and mod(min_hours_between_sessions,1)=0)) and length(agenda_notes)<=1000)),
  'equipment', (select count(*) from public.athlete_equipment where not private.valid_equipment(equipment)),
  'injuries', (select count(*) from public.injuries where not (
    length(trim(injury_id)) between 1 and 200 and body_area in ('','Cabeza/cuello','Hombro','Brazo/codo','Muñeca/mano','Espalda','Cadera','Muslo','Rodilla','Pantorrilla','Tobillo/pie') and
    side in ('','none','left','right','both') and status in ('active','improving','resolved') and
    (pain_level_0_10 is null or (pain_level_0_10 between 0 and 10 and mod(pain_level_0_10,1)=0)) and
    (coalesce(pain_level_0_10,0)=0 or body_area<>'') and length(movement_restrictions)<=500 and length(notes)<=1000 and
    (resolved_at is null or started_at is null or resolved_at>=started_at))),
  'nutrition', (select count(*) from public.nutrition_preferences where not (
    goal in ('rendimiento','mantenimiento','perdida_grasa') and diet_type in ('','omnivore','vegetarian','vegan','pescatarian','other') and
    caffeine_tolerance in ('','none','low','medium','high') and fasted_training_preference in ('','never','sometimes','usually') and
    length(allergies)<=500 and length(intolerances)<=500 and length(usual_meal_times)<=500 and length(supplements)<=500 and length(notes)<=1000)),
  'readiness', (select count(*) from public.daily_readiness where not (
    (sleep_hours is null or (sleep_hours between 0 and 24 and mod(sleep_hours*2,1)=0)) and
    (sleep_quality_1_5 is null or (sleep_quality_1_5 between 1 and 5 and mod(sleep_quality_1_5,1)=0)) and
    (stress_1_5 is null or (stress_1_5 between 1 and 5 and mod(stress_1_5,1)=0)) and
    (fatigue_1_5 is null or (fatigue_1_5 between 1 and 5 and mod(fatigue_1_5,1)=0)) and
    (muscle_soreness_1_5 is null or (muscle_soreness_1_5 between 1 and 5 and mod(muscle_soreness_1_5,1)=0)) and
    (leg_soreness_1_5 is null or (leg_soreness_1_5 between 1 and 5 and mod(leg_soreness_1_5,1)=0)) and
    (upper_soreness_1_5 is null or (upper_soreness_1_5 between 1 and 5 and mod(upper_soreness_1_5,1)=0)) and
    (motivation_1_5 is null or (motivation_1_5 between 1 and 5 and mod(motivation_1_5,1)=0)) and
    (hydration_1_5 is null or (hydration_1_5 between 1 and 5 and mod(hydration_1_5,1)=0)) and
    (pain_0_10 is null or (pain_0_10 between 0 and 10 and mod(pain_0_10,1)=0)) and
    (resting_hr is null or (resting_hr between 25 and 240 and mod(resting_hr,1)=0)) and
    (hrv is null or (hrv between 1 and 500 and mod(hrv,1)=0)) and date<=current_date and
    (coalesce(pain_0_10,0)=0 or length(trim(pain_location))>0) and length(pain_location)<=100 and length(notes)<=1000)),
  'workouts', (select count(*) from public.workout_logs where not (
    length(trim(workout_log_id)) between 1 and 200 and length(trim(training_week_id)) between 1 and 200 and length(trim(training_day_id)) between 1 and 200 and
    status in ('completado','parcial','saltado','adaptado') and date<=current_date and (status='saltado' or (duration_minutes is not null and session_rpe is not null)) and
    (duration_minutes is null or (duration_minutes between 0 and 600 and mod(duration_minutes,1)=0)) and
    (session_rpe is null or (session_rpe between 1 and 10 and mod(session_rpe,1)=0)) and
    (avg_hr is null or (avg_hr between 25 and 240 and mod(avg_hr,1)=0)) and (max_hr is null or (max_hr between 25 and 240 and mod(max_hr,1)=0)) and
    (avg_hr is null or max_hr is null or avg_hr<=max_hr) and (calories is null or (calories between 0 and 10000 and mod(calories,1)=0)) and
    (completed_percentage is null or (completed_percentage between 0 and 100 and mod(completed_percentage,5)=0)) and
    (started_at is null or finished_at is null or finished_at>=started_at) and length(notes)<=1000 and length(what_went_well)<=500 and length(what_went_wrong)<=500)),
  'coach', (select count(*) from public.coach_advices where not (jsonb_typeof(input_snapshot_json)='object' and jsonb_typeof(advice_json)='object' and length(user_feedback)<=1000)),
  'tests', (select count(*) from public.training_test_results where not (performed_at<=now() and private.valid_training_test_result(test_id,result_json) and jsonb_typeof(calculated_json)='object' and length(coalesce(notes,''))<=1000))
);
$$;

revoke all on function private.input_domain_preflight() from public, anon;
grant execute on function private.input_domain_preflight() to authenticated;

alter table public.profiles
  add constraint profiles_height_domain check (height_cm is null or (height_cm between 120 and 230 and mod(height_cm,1)=0)) not valid,
  add constraint profiles_weight_domain check (weight_kg is null or (weight_kg between 35 and 250 and mod(weight_kg*2,1)=0)) not valid,
  add constraint profiles_sex_domain check (sex is null or sex in ('female','male','other')) not valid,
  add constraint profiles_hyrox_category_domain check (hyrox_category='' or hyrox_category in ('women_open','men_open','women_pro','men_pro','doubles_women','doubles_men','doubles_mixed','doubles_women_pro','doubles_men_pro','relay_women','relay_men','relay_mixed')) not valid,
  add constraint profiles_name_length check (length(name)<=500) not valid;

alter table public.athlete_metrics add constraint athlete_metrics_input_domain check (
  (resting_hr_baseline is null or (resting_hr_baseline between 25 and 240 and mod(resting_hr_baseline,1)=0)) and
  (resting_hr_today is null or (resting_hr_today between 25 and 240 and mod(resting_hr_today,1)=0)) and
  (max_hr is null or (max_hr between 25 and 240 and mod(max_hr,1)=0)) and (lthr is null or (lthr between 25 and 240 and mod(lthr,1)=0)) and
  (hrv_baseline is null or (hrv_baseline between 1 and 500 and mod(hrv_baseline,1)=0)) and
  (current_running_volume_km is null or (current_running_volume_km between 0 and 300 and mod(current_running_volume_km*2,1)=0)) and
  (current_long_run_km is null or (current_long_run_km between 0 and 100 and mod(current_long_run_km*2,1)=0)) and
  (current_running_volume_km is null or current_long_run_km is null or current_long_run_km<=current_running_volume_km) and
  hyrox_experience in ('','primera vez','1-2 carreras','3+ carreras') and strength_experience in ('','baja','media','alta') and
  (rftp='' or private.valid_pace_text(rftp)) and (z2_pace_low='' or private.valid_pace_text(z2_pace_low)) and
  (z2_pace_high='' or private.valid_pace_text(z2_pace_high)) and (five_k_pace='' or private.valid_pace_text(five_k_pace)) and
  (ten_k_pace='' or private.valid_pace_text(ten_k_pace)) and (lthr is null or max_hr is null or lthr<=max_hr)
) not valid;

alter table public.athlete_availability
  add constraint athlete_availability_days_domain check (private.valid_day_array(available_days)) not valid,
  add constraint athlete_availability_input_domain check (preferred_training_time in ('','mañana','mediodía','tarde','noche') and
    (max_session_minutes is null or (max_session_minutes between 15 and 360 and mod(max_session_minutes,5)=0)) and
    (min_hours_between_sessions is null or (min_hours_between_sessions between 1 and 24 and mod(min_hours_between_sessions,1)=0)) and length(agenda_notes)<=1000) not valid;

alter table public.athlete_equipment add constraint athlete_equipment_json_domain check (private.valid_equipment(equipment)) not valid;

alter table public.injuries add constraint injuries_input_domain check (
  length(trim(injury_id)) between 1 and 200 and body_area in ('','Cabeza/cuello','Hombro','Brazo/codo','Muñeca/mano','Espalda','Cadera','Muslo','Rodilla','Pantorrilla','Tobillo/pie') and
  side in ('','none','left','right','both') and status in ('active','improving','resolved') and
  (pain_level_0_10 is null or (pain_level_0_10 between 0 and 10 and mod(pain_level_0_10,1)=0)) and
  (coalesce(pain_level_0_10,0)=0 or body_area<>'') and length(movement_restrictions)<=500 and length(notes)<=1000 and
  (resolved_at is null or started_at is null or resolved_at>=started_at)
) not valid;

alter table public.nutrition_preferences add constraint nutrition_input_domain check (
  goal in ('rendimiento','mantenimiento','perdida_grasa') and diet_type in ('','omnivore','vegetarian','vegan','pescatarian','other') and
  caffeine_tolerance in ('','none','low','medium','high') and fasted_training_preference in ('','never','sometimes','usually') and
  length(allergies)<=500 and length(intolerances)<=500 and length(usual_meal_times)<=500 and length(supplements)<=500 and length(notes)<=1000
) not valid;

alter table public.daily_readiness add constraint daily_readiness_input_domain check (
  (sleep_hours is null or (sleep_hours between 0 and 24 and mod(sleep_hours*2,1)=0)) and
  (sleep_quality_1_5 is null or (sleep_quality_1_5 between 1 and 5 and mod(sleep_quality_1_5,1)=0)) and
  (stress_1_5 is null or (stress_1_5 between 1 and 5 and mod(stress_1_5,1)=0)) and
  (fatigue_1_5 is null or (fatigue_1_5 between 1 and 5 and mod(fatigue_1_5,1)=0)) and
  (muscle_soreness_1_5 is null or (muscle_soreness_1_5 between 1 and 5 and mod(muscle_soreness_1_5,1)=0)) and
  (leg_soreness_1_5 is null or (leg_soreness_1_5 between 1 and 5 and mod(leg_soreness_1_5,1)=0)) and
  (upper_soreness_1_5 is null or (upper_soreness_1_5 between 1 and 5 and mod(upper_soreness_1_5,1)=0)) and
  (motivation_1_5 is null or (motivation_1_5 between 1 and 5 and mod(motivation_1_5,1)=0)) and
  (hydration_1_5 is null or (hydration_1_5 between 1 and 5 and mod(hydration_1_5,1)=0)) and
  (pain_0_10 is null or (pain_0_10 between 0 and 10 and mod(pain_0_10,1)=0)) and
  (resting_hr is null or (resting_hr between 25 and 240 and mod(resting_hr,1)=0)) and
  (hrv is null or (hrv between 1 and 500 and mod(hrv,1)=0)) and date<=current_date and
  (coalesce(pain_0_10,0)=0 or length(trim(pain_location))>0) and length(pain_location)<=100 and length(notes)<=1000
) not valid;

alter table public.workout_logs add constraint workout_logs_input_domain check (
  length(trim(workout_log_id)) between 1 and 200 and length(trim(training_week_id)) between 1 and 200 and length(trim(training_day_id)) between 1 and 200 and
  status in ('completado','parcial','saltado','adaptado') and date<=current_date and (status='saltado' or (duration_minutes is not null and session_rpe is not null)) and
  (duration_minutes is null or (duration_minutes between 0 and 600 and mod(duration_minutes,1)=0)) and
  (session_rpe is null or (session_rpe between 1 and 10 and mod(session_rpe,1)=0)) and
  (avg_hr is null or (avg_hr between 25 and 240 and mod(avg_hr,1)=0)) and (max_hr is null or (max_hr between 25 and 240 and mod(max_hr,1)=0)) and
  (avg_hr is null or max_hr is null or avg_hr<=max_hr) and (calories is null or (calories between 0 and 10000 and mod(calories,1)=0)) and
  (completed_percentage is null or (completed_percentage between 0 and 100 and mod(completed_percentage,5)=0)) and
  (started_at is null or finished_at is null or finished_at>=started_at) and length(notes)<=1000 and length(what_went_well)<=500 and length(what_went_wrong)<=500
) not valid;

alter table public.coach_advices
  add constraint coach_advices_json_shape check (jsonb_typeof(input_snapshot_json)='object' and jsonb_typeof(advice_json)='object') not valid,
  add constraint coach_advices_feedback_length check (length(user_feedback)<=1000) not valid;

alter table public.training_test_results add constraint training_test_results_input_domain check (
  performed_at<=now() and private.valid_training_test_result(test_id,result_json) and jsonb_typeof(calculated_json)='object' and length(coalesce(notes,''))<=1000
) not valid;

-- Cleanup/validation is a separate reviewed rollout step:
-- SELECT private.input_domain_preflight();
-- Only after explicit user-approved corrections should a later migration validate constraints.
