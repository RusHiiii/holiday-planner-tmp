import React, {useEffect, useReducer, useState} from 'react'
import { invoke } from '@tauri-apps/api'

const LOAD_HOLIDAY_AMOUNT = 'LOAD_HOLIDAY_AMOUNT';
const STARTED_HOLIDAY_AMOUNT = 'STARTED_HOLIDAY_AMOUNT';

function reducer(state, action) {
  switch (action.type) {
    case LOAD_HOLIDAY_AMOUNT:
      return {
        ...state,
        startedHolidayAmount: action.holidayAmount,
        loaded: true
      };
    case STARTED_HOLIDAY_AMOUNT:
      return {
        ...state,
        startedHolidayAmount: action.value
      };
    default:
      throw new Error();
  }
}

async function getStartHolidayAmount(dispatch) {
  const holidayAmount = await invoke('get_start_holiday_amount');

  dispatch({
    type: LOAD_HOLIDAY_AMOUNT,
    holidayAmount: holidayAmount
  })
}

const initialState = {
  startedHolidayAmount: null,
  loaded: false
};

function HolidayParameter(props) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getStartHolidayAmount(dispatch);
  }, []);

  const setStartHolidayAmount = async (startHolidayAmount) => {
    await invoke('set_start_holiday_amount', {startHolidayAmount: startHolidayAmount});

    props.onSuccess();
  }

  return (
    <div>
      <h2 className="text-2xl text-gray-800 font-bold text-left mb-6">Mes paramètres</h2>
      <form className="w-full max-w-2xl">
        <div className="md:flex md:items-center mb-6">
          <div className="md:w-5/12">
            <label className="block md:text-right mb-1 md:mb-0 pr-4" htmlFor="inline-full-name">
              Nombre de congé (1er Janvier)
            </label>
          </div>
          <div className="md:w-7/12">
            <input defaultValue={state.startedHolidayAmount?.toFixed(2)} onChange={(evt) => dispatch({type: STARTED_HOLIDAY_AMOUNT, value: parseFloat(evt.target.value)})} className="form-control block w-full px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" id="inline-full-name" type="number" min={0} />
          </div>
        </div>
        <div className="md:flex md:items-center">
          <div className="md:w-5/12"></div>
          <div className="md:w-7/12">
            <button onClick={() => setStartHolidayAmount(state.startedHolidayAmount)} className="bg-white font-medium text-sm inline-flex items-center justify-center px-3 py-2 border border-gray-200 rounded leading-5 shadow-sm transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 hover:border-gray-300 text-gray-600" type="button">
              Valider
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default HolidayParameter;
