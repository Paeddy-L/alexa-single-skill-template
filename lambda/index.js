/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */

const stationName = "STATIONSNAME"
const spokenStationName = "dein ausgesprochener Sendername"

const Alexa = require('ask-sdk-core');
const axios = require('axios');

const messages = {
    continue:
        'Weiterhin viel Spaß',
    apiErrorSpeak:
        'Das weiß ich aktuell leider nicht. Bitte versuche es später noch einmal.',
    apiErrorShow:
        'Bitte versuche es später noch einmal.', // Denke an den begrenzten Platz auf dem Echo Spot
    help:
        'Du hörst einen Sender von laut f m',
    pause:
        'Ok',
    stop:
        'Bis bald!',
    welcome:
        `Herzlich Willkommen bei ${spokenStationName}`,
    more:
        'Wenn Du mehr Sender hören willst, besuch uns auf laut punkt <say-as interpret-as="cardinal">FM</say-as>.',
    unable:
        'Das kann ich leider nicht.',
    fallback:
        'Ich weiß nicht, wie ich das schaffen soll. Bitte versuch etwas anderes'
};

// Clean station name
const stationNameClean = function() {
    return stationName.substring(stationName.lastIndexOf("/") + 1).replace(/[^A-Za-z0-9-_]/g,'').toLowerCase()
}

// Create the stream URL
const url = `https://stream.laut.fm/${stationNameClean()}?ref=alexa-own-${stationNameClean()}`;

// Creation of the token
const token = function() {
    return url + '&' + ( new Date() ).getTime();
}

// Read of APL documents for use in handlers
const StationAPL = function() {
    return require('./station-data-apl.json');
}

// Create CET or CEST time format instead of UTC
const dateCET_CEST = function() {
    let options = {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      },
    formatter = new Intl.DateTimeFormat([], options);
    return new Date(formatter.format(new Date()));
}

// Get information about the station
const StationInfoUrl = function() {
   return `https://api.laut.fm/station/${stationNameClean()}`
}

// Get information about the current song
const StationCurrentSongUrl = function() {
    return `https://api.laut.fm/station/${stationNameClean()}/last_songs`
}

// Make an API request
const APIRequest = async (url) => {
    try {
        const { data } = await axios.get(url);
        return data;
    } catch (error) {
        console.error(`~~~~ Error API-Request: ${error}`);
    }
};

// Change to speak correctly
function ssmlChange (data) {
    return data
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\\/g, '\\\\')
}

 // Check if APL is supported
 function supportsAPL(handlerInput) {
    const supportedInterfaces = handlerInput.requestEnvelope.context.System.device.supportedInterfaces;
    const aplInterface = supportedInterfaces['Alexa.Presentation.APL'];
    return aplInterface !== null && aplInterface !== undefined;
}

// Öffne, starte, spiele {invocation name}
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest'
          || (Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayStationIntent');
    },
    async handle(handlerInput) {
        const speakText = `${messages.welcome}`;
        let StreamInfo = ``;
        try {
            const [Info] = await Promise.all([
                (APIRequest(StationInfoUrl())),
            ]);
            StreamInfo = {
                "type": `AudioPlayer.Play`,
                "playBehavior": "REPLACE_ALL",
                "audioItem": {
                    "stream": {
                        "token": token(),
                    },
                    "metadata" : {
                        "title": `${Info.format}`,
                        "subtitle": ``,
                        "art": {
                            "sources": [
                              {
                                "contentDescription": `Sender Logo`,
                                "url": `${Info.images.station}`,
                                "widthPixels": 512,
                                "heightPixels": 512
                              }
                            ]
                        },
                        "backgroundImage": {
                            "sources": [
                              {
                                "url": ``
                              }
                            ]
                        }                        
                    }
                }
            };
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Willkommen`,
                            "data": `Herzlich willkommen bei ${Info.display_name}`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,                          
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 70
                            
                        }
                    }
                })
                .addAudioPlayerPlayDirective('REPLACE_ALL', url, StreamInfo.audioItem.stream.token, 0, null, StreamInfo.audioItem.metadata)
                .getResponse();
            } else {
                const Card = `Herzlich willkommen bei ${Info.display_name}`
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Willkommen', Card, Info.images.station_80x80, Info.images.station)
                  .addAudioPlayerPlayDirective('REPLACE_ALL', url, StreamInfo.audioItem.stream.token, 0, null, StreamInfo.audioItem.metadata)
                  .getResponse();
            }
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            StreamInfo = {
                "type": `AudioPlayer.Play`,
                "playBehavior": "REPLACE_ALL",
                "audioItem": {
                    "stream": {
                        "token": token(),
                    },
                    "metadata" : {
                        "title": `${stationNameClean()}`,
                    }
                }
            };
            const Card = `Herzlich willkommen bei ${stationNameClean()}`
            return handlerInput.responseBuilder
              .speak(ssmlChange(speakText))
              .withSimpleCard('Willkommen', Card)
              .addAudioPlayerPlayDirective('REPLACE_ALL', url, StreamInfo.audioItem.stream.token, 0, null, StreamInfo.audioItem.metadata)
              .getResponse();
        }
    },
};

// Current Song
const CurrentSongHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'CurrentSongIntent'
    },
    async handle(handlerInput) {
        try {
            const [Info, CurrentSong] = await Promise.all([
                (APIRequest(StationInfoUrl())),
                (APIRequest(StationCurrentSongUrl()))
            ]);
            const speakText = `Du hörst ${CurrentSong[0].artist.name} mit dem Titel ${CurrentSong[0].title}`;
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Aktueller Titel`,
                            "data": `<b>${CurrentSong[0].artist.name}</b><br>${CurrentSong[0].title}`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,                          
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 60
                        }
                    }
                })
                .getResponse();
            } else {
                const Card = `${Info.display_name}\n ${CurrentSong[0].artist.name}\n ${CurrentSong[0].title}`
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Aktueller Titel', Card, Info.images.station_80x80, Info.images.station_640x640)
                  .getResponse();
            }  
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            return handlerInput.responseBuilder
              .speak(messages.apiErrorSpeak)
              .withSimpleCard('Aktueller Titel', messages.apiErrorShow)
              .getResponse();
        }
    },
};

// Last songs
const LastSongsHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'LastSongsIntent'
    },
    async handle(handlerInput) {
        try {
            const [Info, LastSongs] = await Promise.all([
                (APIRequest(StationInfoUrl())),
                (APIRequest(StationCurrentSongUrl()))
            ]);
            const speakText = `Zuletzt lief ${LastSongs[1].artist.name} mit ${LastSongs[1].title} und ${LastSongs[2].artist.name} mit ${LastSongs[2].title}`;
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Zuletzt lief`,
                            "data": `<b>${LastSongs[1].artist.name}</b><br>${LastSongs[1].title}<br><b>${LastSongs[2].artist.name}</b><br>${LastSongs[2].title}`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 0,
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 50
                        }
                    }
                })
                .getResponse();
            } else {
                const Card = `${Info.display_name}\n ${LastSongs[1].artist.name}\n ${LastSongs[2].title}\n${LastSongs[2].artist.name}\n ${LastSongs[2].title}`
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Zuletzt lief', Card, Info.images.station_80x80, Info.images.station_640x640)
                  .getResponse();
            }  
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            return handlerInput.responseBuilder
              .speak(messages.apiErrorSpeak)
              .withSimpleCard('Zuletzt lief', messages.apiErrorShow)
              .getResponse();
        }
    },
};

// Current Playlist
const CurrentPlaylistHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'CurrentPlaylistIntent'
    },
    async handle(handlerInput) {
        try {
            const [Info] = await Promise.all([
                (APIRequest(StationInfoUrl())),
            ]);
            const speakText = `Aktuell hörst du die Sendung ${Info.current_playlist.name}`;
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Aktuelle Sendung`,
                            "data": `${Info.current_playlist.name}`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 90
                        }
                    }
                })
                .getResponse();
            } else {
                const Card = `${Info.display_name}\n ${Info.current_playlist.name}`
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Aktuelle Sendung', Card, Info.images.station_80x80, Info.images.station)
                  .getResponse();
            }
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            return handlerInput.responseBuilder
              .speak(messages.apiErrorSpeak)
              .withSimpleCard('Aktuelle Sendung', messages.apiErrorShow)
              .getResponse();
        }
    },
};

// Next Playlist
const NextPlaylistHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest'
          || (handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'NextPlaylistIntent');
    },
    async handle(handlerInput) {
        let speakText = ``;
        let Card = ``;
        let apl_text =``;
        try {
            const [Info] = await Promise.all([
                (APIRequest(StationInfoUrl())),
            ]);
            const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            const weekday_name = {sun: 'Sonntag', mon: 'Montag', tue: 'Dienstag', wed: 'Mittwoch', thu: 'Donnerstag', fri: 'Freitag', sat: 'Samstag'};        
            if (Info.next_playlist.day === weekday[dateCET_CEST().getDay()]) {
                speakText = `Ab ${Info.next_playlist.hour} Uhr hörst du ${Info.next_playlist.name}`;
                Card = `Ab ${Info.next_playlist.hour}:00 Uhr\n ${Info.next_playlist.name}`;
                apl_text = `Ab ${Info.next_playlist.hour}:00 Uhr<br>${Info.next_playlist.name}`;
            } else if (Info.next_playlist.day === weekday[dateCET_CEST().getDay() +1] && Info.next_playlist.hour === 0) {
                speakText = `Ab ${Info.next_playlist.hour} Uhr hörst du ${Info.next_playlist.name}`;
                Card = `Ab ${Info.next_playlist.hour}:00 Uhr\n ${Info.next_playlist.name}`;
                apl_text = `Ab ${Info.next_playlist.hour}:00 Uhr<br>${Info.next_playlist.name}`;
            } else if (Info.next_playlist.day === weekday[dateCET_CEST().getDay() +1]) {
                speakText = `Morgen ab ${Info.next_playlist.hour} Uhr hörst du ${Info.next_playlist.name}`;
                Card = `Morgen ab ${Info.next_playlist.hour}:00 Uhr\n ${Info.next_playlist.name}`;
                apl_text = `Morgen ab ${Info.next_playlist.hour}:00 Uhr<br>${Info.next_playlist.name}`;                
            } else {
                speakText = `Am ${weekday_name[Info.next_playlist.day]} hörst du ab ${Info.next_playlist.hour} Uhr ${Info.next_playlist.name}`;
                Card = `${weekday_name[Info.next_playlist.day]} ab ${Info.next_playlist.hour}:00 Uhr\n ${Info.next_playlist.name}`;
                apl_text = `Am ${weekday_name[Info.next_playlist.day]} hörst du ab ${Info.next_playlist.hour} Uhr<br> ${Info.next_playlist.name}`;
            }            
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Nächste Sendung`,
                            "data": `${apl_text}`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,                          
                            "OtherPadding2Top": 10,
                            "RoundPaddingTop": 70
                        }
                    }
                })
                .getResponse();                
            } else {
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Nächste Sendung', Card, Info.images.station_80x80, Info.images.station)
                  .getResponse();
            }
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            return handlerInput.responseBuilder
              .speak(messages.apiErrorSpeak)
              .withSimpleCard('Nächste Sendung', messages.apiErrorShow)
              .getResponse();
        }
    },
};

// Pause
const PauseIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PauseIntent'
    },
    async handle(handlerInput) {
        const speakText = `${messages.pause}`;
        try {
            const [Info] = await Promise.all([
                (APIRequest(StationInfoUrl())),
            ]);
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Information`,
                            "data": `Mit weiter, geht's weiter`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,                          
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 70
                        }
                    }
                })
                .addAudioPlayerStopDirective()
                .getResponse();
            } else {
                const Card = `${Info.display_name}\n Mit weiter, geht's weiter`
                return handlerInput.responseBuilder
                  .addAudioPlayerStopDirective()
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Information', Card, Info.images.station_80x80, Info.images.station)
                  .getResponse();
            }
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            return handlerInput.responseBuilder
              .addAudioPlayerStopDirective()
              .speak(ssmlChange(speakText))
              .withSimpleCard('Information', `Mit weiter, geht's weiter`)
              .getResponse();
        }
    }
}

// Help
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    async handle(handlerInput) {
        let speakText = messages.help;
       
        return handlerInput.responseBuilder
          .speak(ssmlChange(speakText))
          .addAudioPlayerPlayDirective()
          .getResponse();
    }
};

// Cancel or stop
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
          || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakText = messages.stop;

        return handlerInput.responseBuilder
          .addAudioPlayerStopDirective()
          .speak(ssmlChange(speakText))
          .withShouldEndSession(true)
          .getResponse();
    }
};

// Next / Continue
const NextIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
          && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.NextIntent'
          || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.ResumeIntent');
    },
    
    async handle(handlerInput) {
        const speakText = `${messages.continue}`;
        let StreamInfo = ``;
        try {
            const [Info] = await Promise.all([
                (APIRequest(StationInfoUrl())),
            ]);
            StreamInfo = {
                "type": `AudioPlayer.Play`,
                "playBehavior": "REPLACE_ALL",
                "audioItem": {
                    "stream": {
                        "token": token(),
                    },
                    "metadata" : {
                        "title": `${Info.format}`,
                        "subtitle": ``,
                        "art": {
                            "sources": [
                              {
                                "contentDescription": `Sender Logo`,
                                "url": `${Info.images.station}`,
                                "widthPixels": 512,
                                "heightPixels": 512
                              }
                            ]
                        },
                        "backgroundImage": {
                            "sources": [
                              {
                                "url": ``
                              }
                            ]
                        }                        
                    }
                }
            };
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": "Information",
                            "data": "Weiterhin viel Spaß",
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 90
                        }
                    }
                })
                .addAudioPlayerPlayDirective('REPLACE_ALL', url, StreamInfo.audioItem.stream.token, 0, null, StreamInfo.audioItem.metadata)
                .getResponse();
            } else {
                const Card = `${Info.display_name}\n ${messages.continue}`
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Weiter', Card, Info.images.station_80x80, Info.images.station)
                  .addAudioPlayerPlayDirective('REPLACE_ALL', url, StreamInfo.audioItem.stream.token, 0, null, StreamInfo.audioItem.metadata)
                  .getResponse();
            }
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            StreamInfo = {
                "type": `AudioPlayer.Play`,
                "playBehavior": "REPLACE_ALL",
                "audioItem": {
                    "stream": {
                        "token": token(),
                    },
                    "metadata" : {
                        "title": `${stationNameClean()}`,
                    }
                }
            };
            const Card = `${stationNameClean()}\n ${messages.continue}`
            return handlerInput.responseBuilder
              .speak(ssmlChange(speakText))
              .withSimpleCard('Weiter', Card)
              .addAudioPlayerPlayDirective('REPLACE_ALL', url, StreamInfo.audioItem.stream.token, 0, null, StreamInfo.audioItem.metadata)
              .getResponse();
        }
    },

}

//Previous and Repeat
const PreviousRepeatIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.PreviousIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.RepeatIntent')
    },
    async handle(handlerInput) {
        const speakText = `${messages.unable}`;
        try {
            const [Info] = await Promise.all([
                (APIRequest(StationInfoUrl())),
            ]);
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Information`,
                            "data": `Das kann ich leider nicht.`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 70
                        }
                    }
                })
                .getResponse();
            } else {
                const Card = `${Info.display_name}\n Das kann ich leider nicht.`
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Information', Card, Info.images.station_80x80, Info.images.station)
                  .getResponse();
            }
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            return handlerInput.responseBuilder
              .speak(ssmlChange(speakText))
              .withSimpleCard('Information', `Das kann ich leider nicht.`)
              .getResponse();
        }          
    }
}
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    async handle(handlerInput) {
        const speakText = `${messages.fallback}`;
        try {
            const [Info] = await Promise.all([
                (APIRequest(StationInfoUrl())),
            ]);
            if (supportsAPL(handlerInput)) {
                return handlerInput.responseBuilder
                .speak(ssmlChange(speakText))
                .addDirective({
                    type: `Alexa.Presentation.APL.RenderDocument`,
                    document: StationAPL(),
                    datasources: {
                        "StationData": {
                            "action": `Information`,
                            "data": `${speakText}`,
                            "image": `${Info.images.station}`,
                            "displayName": `${Info.display_name}`,
                            "OtherPadding1Top": 40,                          
                            "OtherPadding2Top": 20,
                            "RoundPaddingTop": 70
                        }
                    }
                })
                .getResponse();
            } else {
                const Card = `${Info.display_name}\n ${speakText}`
                return handlerInput.responseBuilder
                  .speak(ssmlChange(speakText))
                  .withStandardCard('Information', Card, Info.images.station_80x80, Info.images.station)
                  .getResponse();
            }
        } catch (error) {
            console.log(`~~~~ Error API: ${error}`);
            return handlerInput.responseBuilder
              .speak(ssmlChange(speakText))
              .withSimpleCard('Information', `${speakText}`)
              .getResponse();
        }
   }
};

/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
 
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakText = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
          .speak(ssmlChange(speakText))
          //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
          .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakText = `${messages.fallback}`;
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
          .speak(ssmlChange(speakText))
          .reprompt(speakText)
          .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CurrentSongHandler,
        LastSongsHandler,
        CurrentPlaylistHandler,
        NextPlaylistHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        PauseIntentHandler,
        PreviousRepeatIntentHandler,
        NextIntentHandler,
        IntentReflectorHandler,
    )
    .addErrorHandlers(
        ErrorHandler)
    .lambda();
