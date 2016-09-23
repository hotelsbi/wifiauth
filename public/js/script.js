function select_language(language) {
    $("[lang]").each(function () {
        if ($(this).attr("lang") == language) {
            $(this).show();
            $(this).innerHTML += 'xxx';
        }
        else {
            $(this).hide();
        }
    });
}

function check(mac) {
    $.ajax({
        type: 'POST',
        url: '/check',
        data: {'mac': mac},
        success: function(data) {
            console.log(data);
            if (data.result) {
                document.login.submit();
            }
        }
    });
}

function ping() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (xhttp.readyState == 4 && xhttp.status == 200) {
            //window.location.reload(true);
            window.location = "http://metmos.ru"
        }
    }
    try {
        xhttp.open("GET", "http://cors.io/?u=http://www.hotelsbi.com", true);
        xhttp.send();
    }
    catch (err) {
        console.log(err);
    }
}

function call(tel) {
    window.location.href = 'tel:' + tel;
}


$(document).ready(function () {
    select_language('ru');
});

