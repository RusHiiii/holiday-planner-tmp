import React, {useEffect, useMemo, useReducer, useState} from 'react'
import { invoke } from '@tauri-apps/api'
import HolidayParameter from "../components/HolidayParameter";
import HolidayItem from "../components/HolidayItem";
import {CURRENT_YEAR, NEXT_YEAR} from "../constant";

const LOAD_LIST = 'LOAD_LIST';
const HOLIDAY_PLANNED = 'HOLIDAY_PLANNED';
const YEAR_DISPLAYED = 'YEAR_DISPLAYED';

function reducer(state, action) {
  switch (action.type) {
    case LOAD_LIST:
      return {
        ...state,
        list: action.list,
        loaded: true
      };
    case YEAR_DISPLAYED:
      return {
        ...state,
        yearToDisplay: action.yearToDisplay
      };
    case HOLIDAY_PLANNED:
      return {
        ...state,
        currentHolidayPlanned: {
          month: action.month,
          value: action.value
        }
      };
    default:
      throw new Error();
  }
}

async function getHolidaysData(dispatch) {
  const list = await invoke('compute_month_leftovers', { monthsCount: 24 });

  dispatch({
    type: LOAD_LIST,
    list: list
  })
}

const initialState = {
  list: [],
  currentHolidayPlanned: null,
  yearToDisplay: CURRENT_YEAR,
  loaded: false
};

function HolidayPlanner() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getHolidaysData(dispatch);
  }, []);

  const holidays = useMemo(() => {
    if (state.yearToDisplay === CURRENT_YEAR) {
      return state.list.slice(0, 12);
    }

    return state.list.slice(12, 24);
  }, [state.list, state.yearToDisplay]);

  return (
    <section className="flex flex-col justify-center antialiased bg-gray-50 text-gray-600 min-h-screen p-10 ">
      <div className="hidden text-yellow-500 text-green-500 text-stone-500 text-blue-500 bg-yellow-500 bg-green-500 bg-stone-500 bg-blue-500 from-yellow-500 from-green-500 from-stone-500 from-blue-500 to-yellow-500 to-green-500 to-stone-500 to-blue-500"></div>
      <div className="h-full">
        <div className="mx-auto">
          <h1 className="text-4xl text-gray-800 font-bold text-center mb-6">Gestionnaire de vacances</h1>
          <HolidayParameter
            onSuccess={() => getHolidaysData(dispatch)}
          />
          <div>
            <h2 className="text-2xl text-gray-800 font-bold text-left mb-6">Mes congès</h2>
            <form className="w-full max-w-2xl">
              <div className="md:flex md:items-center mb-6">
                <div className="md:w-5/12">
                  <label className="block md:text-right mb-1 md:mb-0 pr-4">
                    Sélectionnez l'année à afficher
                  </label>
                </div>
                <div className="md:w-7/12">
                  <select onChange={(evt) => dispatch({type: YEAR_DISPLAYED, yearToDisplay: evt.target.value})} className="form-select appearance-none block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding bg-no-repeat border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none">
                    <option selected value={CURRENT_YEAR}>Année courante</option>
                    <option value={NEXT_YEAR}>Année suivante</option>
                  </select>
                </div>
              </div>
            </form>
            <div className="grid grid-cols-12 gap-6">
              {holidays.map((item, key) => (
                <HolidayItem
                  key={key}
                  idx={key}
                  item={item}
                  yearToDisplay={state.yearToDisplay}
                  onSuccess={() => getHolidaysData(dispatch)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HolidayPlanner
