function serviceWorker(){
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/client/service-worker.js', { scope: '/client/' })
        });
    }
}
