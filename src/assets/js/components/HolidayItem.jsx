import React, {useEffect, useMemo, useReducer, useState} from 'react'
import { invoke } from '@tauri-apps/api'
import {CURRENT_YEAR, monthDisplayed} from "../constant";

const HOLIDAY_PLANNED = 'HOLIDAY_PLANNED';

function reducer(state, action) {
  switch (action.type) {
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

const initialState = {
  currentHolidayPlanned: null
};

function HolidayItem({idx, item, ...props}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const year = useMemo(() => {
    if (props.yearToDisplay === CURRENT_YEAR) {
      return new Date().getFullYear();
    }

    return new Date().getFullYear() + 1;
  }, [props.yearToDisplay]);

  const setPlannedHoliday = async (currentHolidayPlanned) => {
    if (!currentHolidayPlanned) {
      return;
    }

    const monthIncrement = props.yearToDisplay === CURRENT_YEAR ? 0 : 12;

    await invoke('set_planned_holiday', { month: currentHolidayPlanned.month + monthIncrement, numberOfDay: currentHolidayPlanned.value });

    props.onSuccess();
  }

  return (
    <div className="relative col-span-full md:col-span-4 bg-white shadow-md rounded-sm border border-gray-200">
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-${monthDisplayed[idx + 1].color}-500`} aria-hidden="true"></div>
      <div key={year} className="px-5 pt-5 pb-6 border-b border-gray-200">
        <header className="flex items-center mb-2">
          <div className={`w-6 h-6 rounded-full flex-shrink-0 bg-gradient-to-tr from-${monthDisplayed[idx + 1].color}-500 to-${monthDisplayed[idx + 1].color}-500 mr-3`}>
            <svg className="w-6 h-6 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12 17a.833.833 0 01-.833-.833 3.333 3.333 0 00-3.334-3.334.833.833 0 110-1.666 3.333 3.333 0 003.334-3.334.833.833 0 111.666 0 3.333 3.333 0 003.334 3.334.833.833 0 110 1.666 3.333 3.333 0 00-3.334 3.334c0 .46-.373.833-.833.833z"/>
            </svg>
          </div>
          <h3 className="text-lg text-gray-800 font-semibold">{monthDisplayed[idx + 1].name} {year}</h3>
        </header>
        <div className="text-sm mb-2">Souhaitez-vous poser des congés ce mois ?</div>
        <input onChange={(evt) => dispatch({type: HOLIDAY_PLANNED, month: idx + 1, value: parseFloat(evt.target.value)})} min={0} max={30} defaultValue={item.used} type="number" className="mb-8 form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" />
        <button onClick={() => setPlannedHoliday(state.currentHolidayPlanned)} className="font-medium text-sm inline-flex items-center justify-center px-3 py-2 border border-gray-200 rounded leading-5 shadow-sm transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 hover:border-gray-300 text-gray-600 w-full">Valider mes congès !</button>
      </div>
      <div className="px-5 pt-4 pb-5">
        <div className="text-xs text-gray-800 font-semibold uppercase mb-4">Vos congés</div>
        <ul>
          <li className="flex items-center py-1">
            <svg className={`w-3 h-3 flex-shrink-0 fill-current text-${monthDisplayed[idx + 1].color}-500 mr-2`} viewBox="0 0 12 12">
              <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z"/>
            </svg>
            <div className="text-sm">{item.used} congés posé en {monthDisplayed[idx + 1].name} !</div>
          </li>
        </ul>
      </div>
      <div className="px-5 pt-4 pb-5">
        <div className="text-xs text-gray-800 font-semibold uppercase mb-4">Informations</div>
        <ul>
          <li className="flex items-center py-1">
            <svg className={`w-3 h-3 flex-shrink-0 fill-current text-${monthDisplayed[idx + 1].color}-500 mr-2`} viewBox="0 0 12 12">
              <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z"/>
            </svg>
            <div className="text-sm">{item.base.toFixed(2)} congés accumulés</div>
          </li>
          <li className="flex items-center py-1">
            <svg className={`w-3 h-3 flex-shrink-0 fill-current text-${monthDisplayed[idx + 1].color}-500 mr-2`} viewBox="0 0 12 12">
              <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z"/>
            </svg>
            <div className="text-sm">{item.remaining.toFixed(2)} congés restant</div>
          </li>
          <li className="flex items-center py-1">
            <svg className={`w-3 h-3 flex-shrink-0 fill-current text-${monthDisplayed[idx + 1].color}-500 mr-2`} viewBox="0 0 12 12">
              <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z"/>
            </svg>
            <div className="text-sm">{((item.base - item.remaining).toFixed(2))} congés posés en cumulé</div>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default HolidayItem;
