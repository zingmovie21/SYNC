document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket connection
    const socket = io();
    
    // DOM Elements
    const splashScreen = document.getElementById('splashScreen');
    const appContainer = document.getElementById('appContainer');
    const audio = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const repeatBtn = document.getElementById('repeatBtn');
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');
    const currentTimeSpan = document.getElementById('currentTime');
    const durationSpan = document.getElementById('duration');
    const volumeSlider = document.getElementById('volumeSlider');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const roomIdInput = document.getElementById('roomIdInput');
    const connectionStatus = document.getElementById('connectionStatus');
    const playlist = document.getElementById('playlist');
    const nowPlayingTitle = document.querySelector('.now-playing-title');
    const nowPlayingArtist = document.querySelector('.now-playing-artist');

    // State
    let isPlaying = false;
    let currentRoom = null;
    let currentTrackIndex = 0;
    let isShuffleOn = false;
    let isRepeatOn = false;

    const tracks = [
        { title: 'Track 1', artist: 'Artist 1', file: 'song1.mp3' },
        { title: 'Tennu Khabar nahi', artist: 'Artist 2', file: 'song2.mp3' },
        { title: 'O meri Laila', artist: 'Artist 3', file: 'song3.mp3' },
        { title: 'Tu jane na', artist: 'Artist 4', file: 'song4.mp3' },
        { title: 'Tera Hone Laga hoon', artist: 'Artist 5', file: 'song5.mp3' },
    ];

    // Show splash screen on every reload
    splashScreen.style.display = 'flex';
    appContainer.style.opacity = '0';

    setTimeout(() => {
        splashScreen.style.opacity = '0';
        appContainer.style.opacity = '1';
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 800);
    }, 2000);

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateNowPlaying(index) {
        nowPlayingTitle.textContent = tracks[index].title;
        nowPlayingArtist.textContent = tracks[index].artist;
    }

    function initializePlaylist() {
        playlist.innerHTML = '';
        tracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
            item.innerHTML = `
                <div class="track-info">
                    <div class="track-title">${track.title}</div>
                    <div class="track-artist">${track.artist}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                currentTrackIndex = index;
                loadTrack(index);
                if (currentRoom) {
                    socket.emit('trackChange', { index, roomId: currentRoom });
                }
            });
            playlist.appendChild(item);
        });
    }

    function loadTrack(index) {
        audio.src = tracks[index].file;
        updateNowPlaying(index);
        if (isPlaying) {
            audio.play();
        }
        updatePlaylistUI();
    }

    function updatePlaylistUI() {
        document.querySelectorAll('.playlist-item').forEach((item, index) => {
            item.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
        });
    }

    function togglePlayPause() {
        if (isPlaying) {
            audio.pause();
            if (currentRoom) {
                socket.emit('pause', currentRoom);
            }
        } else {
            audio.play();
            if (currentRoom) {
                socket.emit('play', currentRoom);
            }
        }
        isPlaying = !isPlaying;
        playPauseBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }

    function toggleShuffle() {
        isShuffleOn = !isShuffleOn;
        shuffleBtn.classList.toggle('btn-primary');
    }

    function toggleRepeat() {
        isRepeatOn = !isRepeatOn;
        repeatBtn.classList.toggle('btn-primary');
    }

    // Event Listeners
    playPauseBtn.addEventListener('click', togglePlayPause);
    shuffleBtn.addEventListener('click', toggleShuffle);
    repeatBtn.addEventListener('click', toggleRepeat);

    prevBtn.addEventListener('click', () => {
        if (currentTrackIndex > 0) {
            currentTrackIndex--;
            loadTrack(currentTrackIndex);
            if (currentRoom) {
                socket.emit('trackChange', { index: currentTrackIndex, roomId: currentRoom });
            }
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentTrackIndex < tracks.length - 1) {
            currentTrackIndex++;
            loadTrack(currentTrackIndex);
            if (currentRoom) {
                socket.emit('trackChange', { index: currentTrackIndex, roomId: currentRoom });
            }
        }
    });

    audio.addEventListener('timeupdate', () => {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = `${progress}%`;
        currentTimeSpan.textContent = formatTime(audio.currentTime);
        if (currentRoom) {
            socket.emit('updatePosition', { position: audio.currentTime, roomId: currentRoom });
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        durationSpan.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
        if (isRepeatOn) {
            audio.currentTime = 0;
            audio.play();
        } else if (isShuffleOn) {
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * tracks.length);
            } while (nextIndex === currentTrackIndex);
            currentTrackIndex = nextIndex;
            loadTrack(currentTrackIndex);
        } else if (currentTrackIndex < tracks.length - 1) {
            currentTrackIndex++;
            loadTrack(currentTrackIndex);
        }
    });

    progressContainer.addEventListener('click', (e) => {
        const clickPosition = (e.offsetX / progressContainer.offsetWidth);
        audio.currentTime = clickPosition * audio.duration;
        if (currentRoom) {
            socket.emit('updatePosition', { position: audio.currentTime, roomId: currentRoom });
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        audio.volume = e.target.value / 100;
    });

    createRoomBtn.addEventListener('click', () => {
        socket.emit('createRoom');
    });

    joinRoomBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim();
        if (roomId) {
            socket.emit('joinRoom', roomId);
        }
    });

    // Socket event handlers
    socket.on('roomCreated', (roomId) => {
        currentRoom = roomId;
        connectionStatus.textContent = `Room created! Share this ID: ${roomId}`;
    });

    socket.on('play', () => {
        audio.play();
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });

    socket.on('pause', () => {
        audio.pause();
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });

    socket.on('syncPosition', (position) => {
        audio.currentTime = position;
    });

    socket.on('trackChange', (index) => {
        currentTrackIndex = index;
        loadTrack(index);
    });

    socket.on('syncState', (state) => {
        currentTrackIndex = state.trackIndex;
        loadTrack(state.trackIndex);
        audio.currentTime = state.time;
        if (state.isPlaying) {
            audio.play();
            isPlaying = true;
            playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }
    });

    socket.on('error', (message) => {
        connectionStatus.textContent = `Error: ${message}`;
    });

    // Initialize the application
    initializePlaylist();
});