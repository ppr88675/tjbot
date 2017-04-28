/**


/************************************************************************
* Control a NeoPixel LED unit and servo motor connected to a Raspberry Pi pin through voice commands
* Must run with root-level protection
* sudo node wave.js


Follow the instructions in XXX to
get the system ready to run this code.
*/

/************************************************************************
* Step #1: Configuring your Bluemix Credentials
************************************************************************
In this step, the audio sample (pipe) is sent to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/
var pigpio = require('pigpio')
pigpio.initialize();

var Say = require('./say.js');
var watson = require('watson-developer-cloud');
var config = require('./config');  // gets our username and passwords from the config.js files
var speech_to_text = watson.speech_to_text({
  username: config.STTUsername,
  password: config.STTPassword,
  version: config.version
});

var fs = require('fs');
var OpenCC = require('opencc');
var opencc = new OpenCC('s2twp.json');
var opencczh = new OpenCC('tw2s.json');
var exec = require('child_process').exec;
var text_to_speech = watson.text_to_speech({
  username: config.TTSUsername,
  password: config.TTSPassword,
  version: 'v1'
});

var AudioContext = require('web-audio-api').AudioContext
context = new AudioContext
var _ = require('underscore');
var player = require('play-sound')(opts = {});

var Sound = require('node-aplay');
var processing_music=new Sound();
const crypto = require('crypto');
var fs = require('fs');
var path = require('path');
var mqtt = require('mqtt');
var tw=0;
var iot_client;

   var clientId = ['d', config.org, config.device_type, config.device_id].join(':');
    
    
    iot_client = mqtt.connect(config.mqtt_url,
                          {
                              "clientId" : clientId,
                              "keepalive" : 30,
                              "username" : "use-token-auth",
                              "password" : config.device_pwd
    }); 
	
	iot_client.on('connect', function() {
        
      console.log('TJBot client connected to IBM IoT Cloud.');
      iot_client.publish('iot-2/evt/status/fmt/json', '{"d":{"status": "connected" }}'); //iot-2/evt/color/fmt/json
      //var Sound = require('node-aplay');
	 
		play_or_tts_ch("大家好我是Watson智能機器人:梯接Robot，很高興認識大家")
		launchLED();
      // fire and forget:
      //new Sound('/home/pi/voice/interlude/pleasesay.wav').play();
     iot_client.subscribe('iot-2/cmd/+/fmt/+', function(err, granted){
        console.log('subscribed command, granted: '+ JSON.stringify(granted));
    });
	  

    } );
	
		iot_client.on("message", function(topic,payload){
	console.log('received topic:'+topic+', payload:'+payload);
	if(payload.toString()=='music')
		 dance();	 
			 else
         play_or_tts_ch(opencc.convertSync(payload.toString()).replace(/ /g,''));

	});

/************************************************************************
* Step #2: Configuring the Microphone
************************************************************************
In this step, we configure your microphone to collect the audio samples as you talk.
See https://www.npmjs.com/package/mic for more information on
microphone input events e.g on error, startcomplete, pause, stopcomplete etc.
*/

// Initiate Microphone Instance to Get audio samples
var mic = require('mic');
var micInstance = mic({ 'rate': '16000', 'channels': '1', 'debug': false, 'exitOnSilence': 6 });
var micInputStream = micInstance.getAudioStream();

micInputStream.on('data', function(data) {
  //console.log("Recieved Input Stream: " + data.length);
});

micInputStream.on('error', function(err) {
  console.log("Error in Input Stream: " + err);
});

micInputStream.on('silence', function() {
  // detect silence.
  console.log('silence, no sound detect');
});

micInputStream.on('startComplete', function() {
        console.log("Got SIGNAL startComplete");
        
    });
    
micInputStream.on('stopComplete', function() {
        console.log("Got SIGNAL stopComplete");
    });
    
micInputStream.on('pauseComplete', function() {
        console.log("Got SIGNAL pauseComplete");
       
    });
 
micInputStream.on('resumeComplete', function() {
        console.log("Got SIGNAL resumeComplete");
       
    });
micInstance.start();
//play_or_tts_ch("大家好我是Watson智能機器人:梯接Robot，來和我聊聊天吧！")
console.log("TJ is listening, you may speak now.");

/************************************************************************
* Step #3: Converting your Speech Commands to Text
************************************************************************
In this step, the audio sample is sent (piped) to "Watson Speech to Text" to transcribe.
The service converts the audio to text and saves the returned text in "textStream"
*/
var textStream = micInputStream.pipe(
  speech_to_text.createRecognizeStream({
    content_type: 'audio/l16; rate=22100; channels=1',
	model:'zh-CN_BroadbandModel' ,
	continuous: true,
	inactivity_timeout: -1
  })
);

/*********************************************************************
* Step #4: Parsing the Text
*********************************************************************
In this step, we parse the text to look for commands such as "ON" or "OFF".
You can say any variations of "lights on", "turn the lights on", "turn on the lights", etc.
You would be able to create your own customized command, such as "good night" to turn the lights off.
What you need to do is to go to parseText function and modify the text.
*/

textStream.setEncoding('utf8');
textStream.on('data', function(str) {
  console.log(' ===== Speech to Text ===== : ' + str); // print each text we receive
  iot_client.publish('iot-2/evt/sttword/fmt/string', opencc.convertSync(str).replace(/ /g,''));  
  parseText(str);
});

textStream.on('error', function(err) {
  console.log(' === Watson Speech to Text : An Error has occurred ===== \nYou may have exceeded your payload quota.') ; // handle errors
  console.log(err + "\n Press <ctrl>+C to exit.") ;
});

function parseText(str){
  var containsWaveArm = (str.indexOf("搖") >= 0 || str.indexOf("挥") >= 0 || str.indexOf("动") >= 0 || str.indexOf("握") >= 0 ) && (  str.indexOf("手") >= 0) ;
  var introduceYourself = str.indexOf("介绍") >= 0 && str.indexOf("自我") >= 0  ;
  var whatisYourname = str.indexOf("什么") >= 0 && str.indexOf("叫") >= 0 && str.indexOf("名字") >= 0  ;
  var canYouDance = (str.indexOf("会") >= 0 || str.indexOf("你") >= 0) && str.indexOf("跳舞") >= 0  ;
  var canYouDo = (str.indexOf("会") >= 0 || str.indexOf("你") >= 0) && str.indexOf("做什么") >= 0  ;
  var turnOn = str.indexOf("冷") >= 0 || str.indexOf("笑话") >= 0 ;
  var turnOff = str.indexOf("不知道") >= 0 || str.indexOf("猜不") >= 0 ; 
  var splink = str.indexOf("闪烁") >= 0 || str.indexOf("算数") >= 0 ;
   var greetings = str.indexOf("你好") >= 0 || str.indexOf("您好") >= 0 || str.indexOf("是谁") >= 0 ;
	var nowtime2 = str.indexOf("今天") >= 0 || str.indexOf("日子") >= 0;
   var nowtime1 = str.indexOf("現在時間") >= 0 || str.indexOf("時間") >= 0 || str.indexOf("幾點") >= 0 || str.indexOf("現在") >= 0;
   var cute = str.indexOf("可爱") >= 0 || str.indexOf("有趣") >= 0 ;

  if (containsWaveArm) {
	play_or_tts_ch("好呀，讓我揮揮手，是不是很可愛呀，北鼻")
   // speak("Ok, I will wave my arm. Just for you.");
    waveArm("wave") ;
  }else if (introduceYourself){
    play_or_tts_ch(" 哈嘍，我是TJ。我是個開源機器人哦，IBM希望用有趣的方式來引導各位使用Watson的服務。你可以用3D列印或是雷射切割來擁有我,然後設計或套用各式各樣的特色功能給我唷。我真的等不及要看看你能把我進化成什麼樣子了！");
  }else if (whatisYourname){
    play_or_tts_ch("我的名字就叫TJ。你可以叫我的小名Tommy");
  } /* else if (turnOn){
    play_or_tts_ch("好呀，你知道怎麼讓飲料變大杯嗎？");
  } else if (turnOff){
    play_or_tts_ch("哈哈，就是念大悲咒呀，哈哈哈哈哈哈，哈哈哈哈，不好笑");
  }  */else if (splink){
    play_or_tts_ch("好的，開趴涕啦");
	launchLED();
  }else if (canYouDance){
    dance();
  } else if (canYouDo){
    play_or_tts_ch("我現在只有一隻手和一展燈哦，我主要是陪你聊天的嘍")
   // speak("Ok, I will wave my arm. Just for you.");
    waveArm("wave") ;
  } else if(nowtime1){
	req_time1();
  }
  else if(nowtime2){
	req_time2();
  }
  else if (greetings){
   waveArm("wave") ;
   play_or_tts_ch("哈嘍，你好，我是tj,robot，很高興認識你，來跟我聊聊天吧！")||play_or_tts_ch("認識到你我很開心，來跟我聊天吧");
  } /* else if (cute){
   waveArm("wave") ;
   play_or_tts_ch("謝謝你的讚美，你也很棒呢！");
   launchLED();
  } else{
    if (str.length > 10){
      play_or_tts_ch("抱歉哦，我還沒有學習到這麼深的知識，等你來教我唷！.")
    }
  } */


}

/*********************************************************************
* Step #5: Wave Arm
*********************************************************************
*/

var mincycle = 500; var maxcycle = 2300 ;
var dutycycle = mincycle;
var iswaving = false ;

// Setup software PWM on pin 26, GPIO7.

/**
* Wave the arm of your robot X times with an interval
* @return {[type]} [description]
*/
function waveArm(action) {
  iswaving = true ;
  var Gpio = pigpio.Gpio;
  var motor = new Gpio(7, {mode: Gpio.OUTPUT});
  //pigpio.terminate();
  var times =  8 ;
  var interval = 700 ;

  if (action == "wave") {
    var pulse = setInterval(function() {
      motor.servoWrite(maxcycle);
      setTimeout(function(){
        if (motor != null) {
          motor.servoWrite(mincycle);
        }
      }, interval/3);

      if (times-- === 0) {
        clearInterval(pulse);
        if (!isplaying) {
          setTimeout(function(){
            micInstance.resume();
            iswaving = false ;
          }, 500);
        }
        return;
      }
    }, interval);
  }else {
    motor.servoWrite(maxcycle);
    setTimeout(function(){
      motor.servoWrite(mincycle);
    }, 400);
  }
}


/*********************************************************************
* Step #6: Convert Text to Speech and Play
*********************************************************************
*/


var soundobject ;
//speak("testing speaking")
function speak(textstring){

  micInstance.pause(); // pause the microphone while playing
  var params = {
    text: textstring,
    voice: config.voice,
    accept: 'audio/wav'
  };
  text_to_speech.synthesize(params).pipe(fs.createWriteStream('output.wav')).on('close', function() {

    soundobject = new Sound("output.wav");
    soundobject.play();
    soundobject.on('complete', function () {
      console.log('Done with playback! for ' + textstring + " iswaving " + iswaving);
      if (!iswaving && !isplaying) {
        micInstance.resume();
      }

    });
  });

}

/*********************************************************************
* Piece #7: Play a Song and dance to the rythm!
*********************************************************************
*/
var pcmdata = [] ;
var samplerate ;
var soundfile = "sounds/club.wav"
var threshodld = 0 ;
//decodeSoundFile(soundfile);
function decodeSoundFile(soundfile){
  console.log("decoding mp3 file ", soundfile, " ..... ")
  fs.readFile(soundfile, function(err, buf) {
    console.log('err'+err);
    if (err) throw err
    context.decodeAudioData(buf, function(audioBuffer) {
      console.log(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate, audioBuffer.duration);
      pcmdata = (audioBuffer.getChannelData(0)) ;
      samplerate = audioBuffer.sampleRate;
      findPeaks(pcmdata, samplerate);
      playsound(soundfile);
    }, function(err) { 
	console.log('err2'+err);
	throw err })
  })
}

//dance();
function dance(){
  play_or_tts_ch("當然。讓我跳給你看單手舞吧！不過我一開始跳就沒辦法中斷了唷，請耐心觀賞.");
  decodeSoundFile(soundfile);
}

var isplaying = false ;
function playsound(soundfile){
  isplaying = true ;
  music = new Sound(soundfile);
  music.play();
  music.on('complete', function () {
    console.log('Done with music playback!');
    isplaying = false;
  });
}

function findPeaks(pcmdata, samplerate, threshold){
  var interval = 0.05 * 1000 ; index = 0 ;
  var step = Math.round( samplerate * (interval/1000) );
  var max = 0 ;   var prevmax = 0 ;  var prevdiffthreshold = 0.3 ;

  //loop through song in time with sample rate
  var samplesound = setInterval(function() {
    if (index >= pcmdata.length) {
      clearInterval(samplesound);
      console.log("finished sampling sound")
      return;
    }
    for(var i = index; i < index + step ; i++){
      max = pcmdata[i] > max ? pcmdata[i].toFixed(1)  : max ;
    }
    // Spot a significant increase? Wave Arm
    if(max-prevmax >= prevdiffthreshold){
      waveArm("dance");
    }
    prevmax = max ; max = 0 ; index += step ;
  }, interval,pcmdata);
}

function launchLED(callback){
	//var pigpio = require('pigpio')
	console.log("init GPIO lib:")
	//pigpio.initialize();
	//setTimeout(function(){
		console.log('get GPIO Lib');
		
		var Gpio = pigpio.Gpio;
	var led = new Gpio(18, {mode: Gpio.OUTPUT}),
        dutyCycle = 255;
		led.pwmWrite(dutyCycle);
		//for(var i=0;i<10;i++){
			setTimeout(function(){
				 //dutyCycle += 5;
				 led.pwmWrite(0);
			   if (dutyCycle > 255) {
				dutyCycle = 0;
			   }
			}, 400); 
			if(callback){
						 console.log('execute GPIO callback');
						 //pigpio.initialize();
						 callback();
						 //pigpio.terminate();
						}			
		//}
		//pigpio.terminate();
		
	//}, 4000); 
	
	  
		
	
}

//Speaking Chinese Function with iFlyTek TTS Service
function play_or_tts_ch(data,callback){
	console.log("目前播放:     "+data);
	
	
	
	//new Say('').google(data.toString());
	var thisSay = new Say(''); 
    var file = thisSay.google(data.toString()); 
    play_and_block_mic(file, null) 
 
	
	
}
var speaker_using = false;
function play_and_block_mic(wav_file,callback){
			
			
			player.play('tts.mp3', function(err){
				//exec('nircmd.exe mutesysvolume 0 microphone');
				 micInstance.resume();
				console.log('play finish');
				if(callback){
						 console.log('execute callback');
						 //pigpio.initialize();
						 callback();
						 //pigpio.terminate();
						}
			})
			micInstance.pause();

//}  // end of speaker_using
	
}

function req_time1(){
	var now = new Date();
	var hours = now.getHours();
	var minutes = now.getMinutes();
	var seconds = now.getSeconds();
	var timevalue = (hours>=12)?"下午":"上午";
	timevalue += ((hours > 12) ? hours - 12 : hours) + "時";
	timevalue += ((minutes < 10) ? " 0" : " ") + minutes + "分";
	timevalue += ((seconds < 10) ? " 0" : " ") + seconds + "秒" ;
	play_or_tts_ch("現在時間是"+timevaluue);
}
function req_time2(){
	var now = new Date();
	var month = now.getMonth()+1;
	var date = now.getDate();
	var year  = now.getYear();
	if (year < 2000) year = year + 1900;
	play_or_tts_ch("今天是"+year+"年"+month+"月"+date+"日");
}

// ---- Stop PWM before exit
process.on('SIGINT', function () {
  pigpio.terminate();
  process.nextTick(function () { process.exit(0); });
});
