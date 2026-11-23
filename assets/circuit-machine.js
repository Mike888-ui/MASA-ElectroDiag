(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MASA_CIRCUIT=api})(typeof window!=='undefined'?window:globalThis,function(){
  const modes=['DOL','Self-Hold','Jog','Forward / Reverse','Forward / Reverse Interlock','Star-Delta','Dual Motor Sequence','Alternating Motor','Timer','OL Protection','PLC DI','PLC DO','NPN Sensor','PNP Sensor','Emergency Stop','Safety Relay','VFD Run Control'];
  const faults=['NONE','Coil Open','Aux Contact Open','Main Contact Open','Main Contact Welded','Phase Loss R','Phase Loss S','Phase Loss T','OL Trip','Fuse Open','Control Power Loss','24V Low Voltage','Sensor Open','PLC Output Failure','Interlock Failure','Timer Failure','Brake Failure'];
  function create(mode='DOL'){if(!modes.includes(mode))throw Error('未知電路');return {mode,run:false,held:false,direction:null,star:false,delta:false,timer:0,trip:false,safety:true,fault:'NONE',cycle:0,alternate:0,command:false}}
  function transition(previous,action,value){const s={...previous};if(!modes.includes(s.mode)||!faults.includes(s.fault))throw Error('無效狀態');if(action==='INJECT'){if(!faults.includes(value))throw Error('未知故障');s.fault=value;if(value==='OL Trip')s.trip=true;return output(s)}
    if(action==='E_STOP'||action==='TRIP'){s.safety=false;s.trip=true;s.run=false;s.held=false;return output(s)}
    if(action==='STOP'){s.run=false;s.held=false;s.direction=null;s.star=false;s.delta=false;s.command=false;return output(s)}
    if(action==='RESET'||action==='FAULT RESET'){s.run=false;s.held=false;s.direction=null;s.star=false;s.delta=false;s.timer=0;s.trip=false;s.safety=true;s.fault='NONE';s.command=false;return output(s)}
    if(s.trip||!s.safety||['Fuse Open','Control Power Loss','24V Low Voltage','OL Trip'].includes(s.fault))return output(s);
    if(action==='TIMER ADVANCE'){s.timer++;if(s.mode==='Star-Delta'&&s.run&&s.fault!=='Timer Failure'){s.star=false;s.delta=true}if(s.mode==='Dual Motor Sequence'&&s.run&&s.fault!=='Timer Failure')s.command=true;return output(s)}
    if(action==='RELEASE'){if(s.mode==='Jog'||['DOL','Self-Hold'].includes(s.mode)&&s.fault==='Aux Contact Open'){s.run=false}s.held=false;return output(s)}
    if(action==='JOG'){if(s.mode==='Jog'){s.held=true;s.run=true}return output(s)}
    if(action==='FORWARD'||action==='REVERSE'){if(!s.mode.startsWith('Forward / Reverse')||s.run)return output(s);s.direction=action;s.run=true;return output(s)}
    if(action==='START'){if(s.mode.startsWith('Forward / Reverse'))return output(s);s.run=true;s.held=s.mode==='Jog';s.command=true;s.cycle++;if(s.mode==='Star-Delta'){s.star=true;s.delta=false}else if(s.mode==='Alternating Motor')s.alternate=s.cycle%2;return output(s)}
    return output(s)
  }
  function output(s){
    const supplyReady=!['Fuse Open','Control Power Loss','24V Low Voltage'].includes(s.fault);
    const safetyOutput=s.safety&&!s.trip&&s.fault!=='Interlock Failure';
    const active=s.run&&supplyReady&&safetyOutput;
    const sensorMode=['PLC DI','NPN Sensor','PNP Sensor'].includes(s.mode);
    const sensorSignal=sensorMode&&active&&s.fault!=='Sensor Open';
    const plcInput=s.mode==='PLC DI'&&sensorSignal;
    const plcOutput=s.mode==='PLC DO'&&active&&s.fault!=='PLC Output Failure';
    const coil=active&&s.fault!=='Coil Open'&&s.fault!=='PLC Output Failure'&&(!sensorMode||sensorSignal);
    const main=coil&&s.fault!=='Main Contact Open'||s.fault==='Main Contact Welded';
    const phaseLoss=['Phase Loss R','Phase Loss S','Phase Loss T'].includes(s.fault);
    const timerDone=s.timer>0&&s.fault!=='Timer Failure';
    const motorMode=!['PLC DI','PLC DO','NPN Sensor','PNP Sensor','Emergency Stop','Safety Relay'].includes(s.mode);
    const motor=main&&motorMode&&(active||s.fault==='Main Contact Welded')&&!phaseLoss&&s.fault!=='Brake Failure'&&(s.mode!=='Timer'||timerDone);
    const motorSecondary=s.mode==='Dual Motor Sequence'&&motor&&timerDone;
    const aux=coil&&s.fault!=='Aux Contact Open';
    return {...s,contacts:{startNO:!!s.held,stopNC:s.safety&&!s.trip,auxNO:aux,olNC:!s.trip,mainNO:main,interlockNC:!(s.mode.startsWith('Forward / Reverse')&&s.direction)},coil:!!coil,main:!!main,motor:!!motor,motorSecondary:!!motorSecondary,sensorSignal:!!sensorSignal,plcInput:!!plcInput,plcOutput:!!plcOutput,supplyReady,star:!!(s.star&&coil),delta:!!(s.delta&&coil&&timerDone),timerDone,safetyOutput,phaseLoss,source_type:'SIMULATION'}
  }
  return {modes,faults,create,transition,output};
});
