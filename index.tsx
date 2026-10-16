/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SonucApp } from './components/SonucApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const pathname = window.location.pathname;
const isPortal = pathname === '/sonuc' || pathname.startsWith('/sonuc/') || pathname === '/firma' || pathname.startsWith('/firma/');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isPortal ? <SonucApp /> : <App />}
  </React.StrictMode>
);