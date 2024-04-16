document.addEventListener('DOMContentLoaded', () => {
    const swirlingCircle = document.getElementById('voice-activation-ui'); // Correct the ID if necessary
    let isRecording = false;
    let isListening = false; // Added to track listening state
    let mediaRecorder;
    const audioChunks = [];

    swirlingCircle.addEventListener('click', () => {
        if (!isListening) {
            isListening = true; // Set listening state to true when activated
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    isRecording = true;
                    swirlingCircle.className = 'swirling-circle listening-mode'; // Use className to ensure only one class is applied at a time
                    console.log('Voice interaction activated and recording started.');
                    mediaRecorder = new MediaRecorder(stream);
                    mediaRecorder.start();

                    mediaRecorder.addEventListener('dataavailable', event => {
                        audioChunks.push(event.data);
                    });

                    mediaRecorder.addEventListener('stop', () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
                        sendAudioToServer(audioBlob);
                        audioChunks.length = 0; // Clear the chunks array
                        console.log('Recording stopped and data sent to server.');
                        swirlingCircle.className = 'swirling-circle processing-mode'; // Update for visual feedback
                    });
                })
                .catch(error => {
                    console.error('Error accessing the microphone', error);
                    console.error(error.stack);
                });
        } else {
            isListening = false; // Set listening state to false when deactivated
            stopRecording();
        }
    });

    function stopRecording() {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            swirlingCircle.className = 'swirling-circle'; // Reset class
            isRecording = false;
            console.log('Voice interaction deactivated and processing started.');
        }
    }

    function sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append('voiceInput', audioBlob);

        axios.post('/api/voice', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then(response => {
            const audioBlobResponse = new Blob([response.data], { type: 'audio/mpeg' });
            playAudioResponse(audioBlobResponse);
            swirlingCircle.className = 'swirling-circle speaking-mode'; // Update for visual feedback
            console.log('Server response received and speaking.');
        })
        .catch(error => {
            console.error('Error sending audio to server', error);
            console.error(error.stack);
        });
    }

    function playAudioResponse(audioBlob) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createBufferSource();
        let reader = new FileReader();
        reader.onload = function() {
            audioContext.decodeAudioData(reader.result, (buffer) => {
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(0);
                source.onended = () => {
                    swirlingCircle.className = 'swirling-circle listening-mode'; // Reset class after speaking and automatically switch back to listening mode
                    console.log('Audio playback finished, switching back to listening mode.');
                    if (!isRecording && isListening) {
                        swirlingCircle.click(); // Reactivate listening mode without user interaction
                    }
                };
            }, (error) => {
                console.error('Error with decoding audio data', error);
                console.error(error.stack);
            });
        };
        reader.readAsArrayBuffer(audioBlob);
    }
});