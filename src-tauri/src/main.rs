#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use futures::FutureExt;
use serde::{Deserialize, Serialize};
use serde_json::from_reader;
use simple_actor::Actor;
use std::{collections::BTreeMap, path::PathBuf};
use tauri::{Manager, State};
use tokio::io::AsyncWriteExt;

#[derive(Debug, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
struct Month(u32);

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
struct MonthHolidays {
    // Nombre de jour de congés de base, sans compter ceux utilisés.
    base: f32,
    // Nombre de jour de congés restant après avoir dedui les jours posés.
    remaining: f32,
    // Nombre de jour de posés en cours pour le mois
    used: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HolidaysInner {
    start_month: Month,
    start_holiday_amount: f32,
    holiday_per_month: f32,

    holidays: BTreeMap<Month, f32>,
}

#[derive(Clone)]
struct HolidaysActor(Actor<HolidaysInner>);

impl HolidaysActor {
    pub fn new(state: HolidaysInner) -> Self {
        let (actor, driver) = Actor::new(state);
        tauri::async_runtime::spawn(driver);
        Self(actor)
    }

    pub async fn get_start_holiday_amount(&self) -> Option<f32> {
        self.0
            .query(move |state| {
                state.start_holiday_amount
            })
            .await
    }

    pub async fn compute_month_leftovers(&self, months_count: u32) -> Option<Vec<MonthHolidays>> {
        self.0
            .query(move |state| {
                let mut leftovers_array = vec![];

                let mut previous_month: Option<MonthHolidays> = None;

                for i in 0..months_count {
                    let month = Month(state.start_month.0 + i);
                    let holidays_in_month = *state.holidays.get(&month).unwrap_or(&0.0);

                    let m = match previous_month {
                        None => {
                            let base = state.start_holiday_amount + state.holiday_per_month;
                            MonthHolidays {
                                base,
                                remaining: base - holidays_in_month,
                                used: holidays_in_month,
                            }
                        }
                        Some(x) => {
                            let base = x.base + state.holiday_per_month;
                            MonthHolidays {
                                base,
                                remaining: x.remaining + state.holiday_per_month
                                    - holidays_in_month,
                                used: holidays_in_month,
                            }
                        }
                    };

                    previous_month = Some(m);
                    leftovers_array.push(m);
                }

                leftovers_array
            })
            .await
    }

    pub async fn set_planned_holiday(
        &self,
        month: Month,
        number_of_day: f32,
    ) -> Result<(), String> {
        self.0
            .query_blocking(move |state| {
                state.holidays.insert(month, number_of_day);

                async move {
                    let mut file = tokio::fs::File::create(get_app_data_path())
                        .await
                        .map_err(|e| format!("failed to open file: {e}"))?;
                    let bytes = serde_json::to_vec(state)
                        .map_err(|e| format!("failed to serialize: {e}"))?;
                    file.write_all(&bytes)
                        .await
                        .map_err(|e| format!("failed to write to file: {e}"))?;
                    Ok(())
                }
                .boxed()
            })
            .await
            .ok_or(String::from("actor not running"))?
    }

    pub async fn set_start_holiday_amount(
        &self,
        start_holiday_amount: f32,
    ) -> Result<(), String> {
        self.0
            .query_blocking(move |state| {
                state.start_holiday_amount = start_holiday_amount;

                async move {
                    let mut file = tokio::fs::File::create(get_app_data_path())
                        .await
                        .map_err(|e| format!("failed to open file: {e}"))?;
                    let bytes = serde_json::to_vec(state)
                        .map_err(|e| format!("failed to serialize: {e}"))?;
                    file.write_all(&bytes)
                        .await
                        .map_err(|e| format!("failed to write to file: {e}"))?;
                    Ok(())
                }
                .boxed()
            })
            .await
            .ok_or(String::from("actor not running"))?
    }
}

#[tauri::command]
async fn compute_month_leftovers(
    state: State<'_, HolidaysActor>,
    months_count: u32,
) -> Result<Vec<MonthHolidays>, String> {
    state
        .compute_month_leftovers(months_count)
        .await
        .ok_or(String::from("actor is not running"))
}

#[tauri::command]
async fn set_planned_holiday(
    state: State<'_, HolidaysActor>,
    month: Month,
    number_of_day: f32,
) -> Result<(), String> {
    state.set_planned_holiday(month, number_of_day).await
}

#[tauri::command]
async fn set_start_holiday_amount(
    state: State<'_, HolidaysActor>,
    start_holiday_amount: f32,
) -> Result<(), String> {
    state.set_start_holiday_amount(start_holiday_amount).await
}

#[tauri::command]
async fn get_start_holiday_amount(
    state: State<'_, HolidaysActor>
) -> Result<f32, String> {
    state
    .get_start_holiday_amount()
    .await
    .ok_or(String::from("actor is not running"))
}

fn get_app_data_path() -> PathBuf {
    let mut path = tauri::api::path::data_dir().unwrap_or(std::path::PathBuf::from("./"));
    path.push("holiday-planifier/state.json");
    path
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let state = match std::fs::File::open(get_app_data_path()) {
                Err(_) => HolidaysInner {
                    start_month: Month(1),
                    start_holiday_amount: 0.0,
                    holiday_per_month: 2.08,
                    holidays: BTreeMap::new(),
                },
                Ok(file) => from_reader(file)?,
            };

            let actor = HolidaysActor::new(state);

            app.manage(actor);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            compute_month_leftovers,
            set_planned_holiday,
            set_start_holiday_amount,
            get_start_holiday_amount
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
