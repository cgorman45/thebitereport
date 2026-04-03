'use client';

export default function WindPanel() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <p className="text-xs mb-3" style={{ color: '#8899aa' }}>
          Interactive wind, waves, and weather for San Diego fishing grounds
        </p>
        <div className="flex gap-2 mb-3 flex-wrap">
          <a
            href="https://www.windy.com/32.710/-117.230?wind,32.710,-117.230,10"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: '#00d4ff18',
              color: '#00d4ff',
              border: '1px solid #00d4ff44',
            }}
          >
            Open Full Windy.com
          </a>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          title="Windy weather map"
          width="100%"
          height="100%"
          src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=imperial&metricTemp=imperial&metricWind=mph&zoom=9&overlay=wind&product=ecmwf&level=surface&lat=32.7&lon=-117.2&marker=true&calendar=now&pressure=true&type=map&menu=&message=true&forecast=12&theme=dark"
          frameBorder="0"
          style={{ border: 'none' }}
        />
      </div>
    </div>
  );
}
