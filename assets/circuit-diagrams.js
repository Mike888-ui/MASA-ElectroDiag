(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MASA_DIAGRAMS=api})(typeof window!=='undefined'?window:globalThis,function(){
  const configs={
    DOL:['3Φ R/S/T','MCCB / OL','START / STOP','95-96 / 13-14','KM A1/A2','KM L1-L3 / T1-T3','M U/V/W','A1 A2 13 14 95 96'],
    'Self-Hold':['24V / COM','Fuse / OL','START NO / STOP NC','KM 13-14 HOLD','KM A1/A2','KM L/T','M U/V/W','13-14 95-96 A1-A2'],
    Jog:['Control L/N','Fuse / OL','JOG PB / STOP','JOG NO / 95-96','KM A1/A2','KM L/T','M U/V/W','JOG 95-96 A1-A2'],
    'Forward / Reverse':['3Φ R/S/T','MCCB / OL','FWD / REV / STOP','KMF / KMR AUX','KMF / KMR COIL','KMF / KMR MAIN','M U/V/W','KMF/KMR A1-A2'],
    'Forward / Reverse Interlock':['3Φ R/S/T','MCCB / OL','FWD / REV / STOP','NC ELECTRICAL INTERLOCK','KMF / KMR COIL','MECHANICAL INTERLOCK','M U/V/W','KMF/KMR 21-22'],
    'Star-Delta':['3Φ R/S/T','MCCB / OL','START / STOP','TIMER NC / NO','KM / KY / KΔ','STAR / DELTA MAIN','M U1 V1 W1','U2 V2 W2 / A1-A2'],
    'Dual Motor Sequence':['3Φ R/S/T','MCCB / OL','START / TIMER','KM1 AUX / T NO','KM1 / KM2 COIL','KM1 / KM2 MAIN','M1 / M2','T NO / A1-A2'],
    'Alternating Motor':['3Φ R/S/T','MCCB / OL','START / ALT','ALT SELECT','KM1 / KM2 COIL','KM1 / KM2 MAIN','M1 / M2','ALT / A1-A2'],
    Timer:['Control L/N','Fuse / OL','START / STOP','TIMER NO','T / KM COIL','KM L/T','M U/V/W','T NO / A1-A2'],
    'OL Protection':['3Φ R/S/T','MCCB / OL','START / STOP','OL 95-96 NC','KM A1/A2','KM L/T','M U/V/W','95-96 / 97-98'],
    'PLC DI':['24V / 0V','Fuse','SENSOR SWITCH','SENSOR OUT','DI INPUT','DI COM','PLC INPUT IMAGE','+24 0V IN COM'],
    'PLC DO':['24V / 0V','Fuse / OL','PLC COMMAND','DO OUTPUT','DO DRIVER','LOAD CONTACT','FIELD LOAD','DO COM LOAD'],
    'NPN Sensor':['24V / 0V','Fuse','TARGET','NPN OUT','INPUT STAGE','DI COM','PLC INPUT','BN BU BK COM'],
    'PNP Sensor':['24V / 0V','Fuse','TARGET','PNP OUT','INPUT STAGE','DI COM','PLC INPUT','BN BU BK COM'],
    'Emergency Stop':['Control Supply','Fuse','E-STOP NC','SAFETY INPUT','SAFETY OUTPUT','KM FEEDBACK','LOAD ISOLATION','CH1 CH2 / A1-A2'],
    'Safety Relay':['Control Supply','Fuse','RESET / E-STOP','CH1 / CH2','SAFETY RELAY','13-14 / 23-24','KM / LOAD','A1 A2 S11 S12'],
    'VFD Run Control':['3Φ R/S/T','MCCB / DRIVE ALARM','RUN COMMAND','DI / COM','VFD READY','U / V / W OUTPUT','M U/V/W','R S T / U V W']
  };
  function blocks(state){const labels=configs[state.mode];if(!labels)throw Error('未知電路視圖');const sensor=['PLC DI','NPN Sensor','PNP Sensor'].includes(state.mode),safety=['Safety Relay','Emergency Stop'].includes(state.mode),plc=state.mode==='PLC DO';const timer=state.mode==='Timer',dual=state.mode==='Dual Motor Sequence';return labels.map((label,i)=>({label,on:[state.supplyReady,state.contacts.olNC,state.run,sensor?state.sensorSignal:state.contacts.auxNO,sensor?state.plcInput:plc?state.plcOutput:safety?state.safetyOutput:state.coil,dual?state.motorSecondary:timer?state.timerDone:state.main,sensor?state.plcInput:plc?state.plcOutput:safety?state.safetyOutput:state.motor,state.supplyReady][i]}))}
  return {configs,blocks};
});
