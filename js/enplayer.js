var enSongs = [];
var enToSpotIds = {};

var counts = 0; // spinlock

var pl;

function make_it() {
	playlistName = $("#_name").val();
	
	enSongs = new Array();
	$("#results-list").empty();
    var songIDs = $("#_ids").val();

	if( ""===playlistName || ""===songIDs ) {
		alert( "You need to provide both a playlist name and IDs");
	} else {
        var songIDs = songIDs.match(/SO[A-Z0-9]{16}/g);
        console.log("songIDs match", songIDs)
		for( i = 0; i < songIDs.length; i++ ) {
            var _thesong = songIDs[i];
            enSongs.push( _thesong );
            ++counts;
            var parentList = document.getElementById("results-list");
            var listitem = document.createElement("li");
            listitem.setAttribute('id', _thesong);
            listitem.innerHTML = "Song: " + _thesong;
            parentList.appendChild( listitem );
            lookupSpotifyID( _thesong );
		}
	}
}

function create_it() {
	// actually make the playlist
	//TODO if playlist name is in use, see about overwriting vs making a new one
	playlistName = $("#_name").val();
	pl = new models.Playlist( playlistName );	

	console.log("*** in create_it");
	for( i = 0; i < enSongs.length; i++ ) {
		_song = enSongs[ i ];
		_spotifyTrack = enToSpotIds[ _song ];
		if( _spotifyTrack ) {
			console.log( "EN Song ID " + _song + " is " + _spotifyTrack );
			pl.add( _spotifyTrack );
		} else { 
			console.log( "EN Song ID " + _song + " has no valid tracks; skipping.");
		}
	}
}


function lookupSpotifyID( _song ) {
	var url = "http://developer.echonest.com/api/v4/song/profile?api_key=N6E4NIOVYMTHNDM8J&callback=?";
	
	$.getJSON( url, 
		{
			"id": _song,
			"format": "jsonp",
			'bucket': ['tracks', 'id:spotify-WW'],
			"limit": true
		},
		function(data) {
			var response = data.response;
			var songs = response.songs;
			var tracks = songs[0].tracks;
			//TODO if there are multiple tracks, check them all to see which are valid in this region...
			
			var _trackID = findValidTrack( songs[0].id, tracks );
			var _trackID = _trackID.replace("spotify-WW", "spotify");
			enToSpotIds[ songs[0].id ] = _trackID;
			console.log( "EN Song ID " + songs[0].id + " is " + _trackID); 
			--counts;
		})
}

// just return first track
// eventually get all tracks, and walk until we get one that is valid for this region
var trackCount = [];

var validTracks = [];


function findValidTrack( songID, tracks ) {
	console.log("* in findValidTrack for " + songID + " and I have " + tracks.length + " tracks to check" );
	trackCount[ songID ] = 0;
	
	// set default so we know if none found
	var plItem = document.getElementById( songID );
	plItem.innerHTML = "Song: " + songID + "; no valid tracks found yet.";
	enToSpotIds[ songID ] = null;
	
	for( i = 0; i < tracks.length; i++ ) {
		trackCount[ songID ]++;
		console.log( "*** songID = " + songID + "; trackCount is " + trackCount[ songID ] );
		var _trackID = tracks[i].foreign_id.replace("spotify-WW", "spotify");
    	
		var t = models.Track.fromURI( _trackID, function(track) {
			console.log( "--- in inner function for songID = " + songID + "; trackCount is " + trackCount[ songID ] );

			trackCount[ songID ]--;
			console.log( "track " + track.uri + "; is playable? " + track.playable + "; album year is " + track.album.year );
			
			if( track.playable) {
				var _uri = track.uri;
				var _year = track.album.year;
				var _title = track.name;
				var _album = track.album.name;
				
				if( validTracks[songID] ) {
					if( validTracks[songID].year > track.album.year) {
						validTracks[songID] = { "id":_uri, "year":_year , "title":_title, "album":_album};
						console.log("track: " + track.uri + "is the new best track for song " + songID );
					}
				
				} else {
					validTracks[songID] = { "id":_uri, "year":_year , "title":_title, "album":_album};
					console.log("track: " + track.uri + "is the new best track for song " + songID );
				}
				var plItem = document.getElementById( songID );
				plItem.innerHTML = "EN: " + songID + " SP: " + validTracks[songID].id + " ; Title: " + validTracks[songID].title + " (" +validTracks[songID].year + ", " + validTracks[songID].album + ")";
				enToSpotIds[ songID ] = validTracks[songID].id;
			}
		} );
	}
	
	waitForTrackCompletion( songID );
	
	console.log("the validTrack for songID " + songID + " is " + validTracks[ songID ].id );
	return validTracks[ songID ].id;
}

function waitForTrackCompletion( songID ) {
	if( trackCount[ songID ] < 1 ) {
		return;
	}
	
	setTimeout( function(){waitForTrackCompletion( songID )}, 500 );
}
