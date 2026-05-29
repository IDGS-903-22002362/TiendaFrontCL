declare global {
  namespace google.maps {
    interface PlacesLibrary {
      PlaceAutocompleteElement: typeof google.maps.places.PlaceAutocompleteElement;
    }
  }

  namespace google.maps.places {
    interface PlacePredictionSelectEvent extends Event {
      placePrediction: PlacePrediction;
    }
  }
}

export {};
