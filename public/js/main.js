$(document).ready(function() {
  $('#challenge').autocomplete({
    serviceUrl: '/lookup',
    dataType: 'json',
    onSelect: function(suggestion) {
      $('#challenge_id').val(suggestion.data);
    }
  }
);
});
