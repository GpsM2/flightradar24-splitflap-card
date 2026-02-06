class FlightRadar24SplitFlapCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.flights = [];
    this.displayedFlights = [];
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Bitte entity angeben (z.B. sensor.flightradar24_airport_arrivals)');
    }

    this.config = {
      entity: config.entity,
      title: config.title || 'ANKÜNFTE',
      max_flights: config.max_flights || 8,
      flip_duration: config.flip_duration || 800,
      flip_delay: config.flip_delay || 50,
      mode: config.mode || 'auto', // 'auto', 'airport', 'area'
      ...config
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    const entity = hass.states[this.config.entity];
    
    if (!entity) {
      console.error('Entity nicht gefunden:', this.config.entity);
      return;
    }

    const newFlights = entity.attributes.flights || [];
    
    // Nur updaten wenn sich Daten geändert haben
    if (JSON.stringify(newFlights) !== JSON.stringify(this.flights)) {
      this.updateFlights(newFlights);
    }
  }

  detectMode(flight) {
    // Auto-detect ob Airport- oder Area-Sensor basierend auf verfügbaren Feldern
    if (this.config.mode !== 'auto') {
      return this.config.mode;
    }
    
    // Airport-Sensor hat status_text, Area-Sensor nicht
    return flight.status_text !== undefined ? 'airport' : 'area';
  }

  updateFlights(newFlights) {
    const oldFlights = this.flights;
    this.flights = newFlights.slice(0, this.config.max_flights);
    
    // Initiales Rendering
    if (this.displayedFlights.length === 0) {
      this.displayedFlights = this.flights.map(f => this.formatFlight(f));
      this.renderFlightBoard();
      return;
    }

    // Finde Änderungen und animiere nur diese
    this.flights.forEach((flight, index) => {
      const newData = this.formatFlight(flight);
      const oldData = this.displayedFlights[index];
      
      if (JSON.stringify(newData) !== JSON.stringify(oldData)) {
        this.animateRow(index, oldData, newData);
      }
    });
  }

  formatFlight(flight) {
    const mode = this.detectMode(flight);
    
    if (mode === 'airport') {
      return this.formatAirportFlight(flight);
    } else {
      return this.formatAreaFlight(flight);
    }
  }

  formatAirportFlight(flight) {
    // Für Airport Arrivals/Departures Sensor
    const scheduled = flight.time_scheduled_arrival ? 
      new Date(flight.time_scheduled_arrival * 1000) : null;
    
    return {
      time: scheduled ? this.formatTime(scheduled) : '--:--',
      flight: (flight.flight_number || flight.callsign || '').padEnd(8, ' ').substring(0, 8),
      from: (flight.airport_city || flight.airport_origin_city || '').padEnd(15, ' ').substring(0, 15),
      status: (flight.status_text || 'ERWARTET').padEnd(12, ' ').substring(0, 12),
      aircraft: (flight.aircraft_model || '').padEnd(12, ' ').substring(0, 12)
    };
  }

  formatAreaFlight(flight) {
    // Für Area-Sensoren (current_in_area, etc.)
    const scheduled = flight.time_scheduled_arrival ? 
      new Date(flight.time_scheduled_arrival * 1000) : null;
    const estimated = flight.time_estimated_arrival ? 
      new Date(flight.time_estimated_arrival * 1000) : null;
    
    return {
      time: scheduled ? this.formatTime(scheduled) : '--:--',
      flight: (flight.flight_number || flight.callsign || '').padEnd(8, ' ').substring(0, 8),
      from: (flight.airport_origin_code_iata || flight.airport_origin_city || '').padEnd(15, ' ').substring(0, 15),
      status: this.getAreaStatus(flight, scheduled, estimated),
      aircraft: (flight.aircraft_model || '').padEnd(12, ' ').substring(0, 12)
    };
  }

  formatTime(date) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  getAreaStatus(flight, scheduled, estimated) {
    if (flight.on_ground === 1) return 'GELANDET   ';
    if (estimated && scheduled) {
      const diff = Math.round((estimated - scheduled) / 60000);
      if (diff > 15) return `+${diff} MIN    `;
      if (diff < -5) return 'FRÜHER     ';
    }
    return 'ERWARTET   ';
  }

  animateRow(rowIndex, oldData, newData) {
    const row = this.shadowRoot.querySelector(`[data-row="${rowIndex}"]`);
    if (!row) return;

    const fields = ['time', 'flight', 'from', 'status', 'aircraft'];
    
    fields.forEach((field, fieldIndex) => {
      const oldText = oldData[field];
      const newText = newData[field];
      
      if (oldText !== newText) {
        this.animateField(row, field, oldText, newText, fieldIndex * 100);
      }
    });

    this.displayedFlights[rowIndex] = newData;
  }

  animateField(row, fieldName, oldText, newText, baseDelay) {
    const cell = row.querySelector(`[data-field="${fieldName}"]`);
    if (!cell) return;

    const chars = cell.querySelectorAll('.flap-char');
    const maxLen = Math.max(oldText.length, newText.length);

    for (let i = 0; i < maxLen; i++) {
      const oldChar = oldText[i] || ' ';
      const newChar = newText[i] || ' ';
      
      if (oldChar !== newChar && chars[i]) {
        this.flipCharacter(chars[i], oldChar, newChar, baseDelay + i * this.config.flip_delay);
      }
    }
  }

  flipCharacter(element, oldChar, newChar, delay) {
    setTimeout(() => {
      element.classList.add('flipping');
      
      setTimeout(() => {
        element.textContent = newChar;
        element.classList.remove('flipping');
      }, this.config.flip_duration / 2);
      
    }, delay);
  }

  renderFlightBoard() {
    const board = this.shadowRoot.querySelector('.flight-board');
    if (!board) return;

    board.innerHTML = '';
    
    this.displayedFlights.forEach((flight, index) => {
      const row = this.createFlightRow(flight, index);
      board.appendChild(row);
    });
  }

  createFlightRow(flight, index) {
    const row = document.createElement('div');
    row.className = 'flight-row';
    row.setAttribute('data-row', index);

    const fields = [
      { name: 'time', value: flight.time, width: '60px' },
      { name: 'flight', value: flight.flight, width: '100px' },
      { name: 'from', value: flight.from, width: '180px' },
      { name: 'status', value: flight.status, width: '130px' },
      { name: 'aircraft', value: flight.aircraft, width: '140px' }
    ];

    fields.forEach(field => {
      const cell = document.createElement('div');
      cell.className = 'flight-cell';
      cell.setAttribute('data-field', field.name);
      cell.style.width = field.width;
      
      for (const char of field.value) {
        const charSpan = document.createElement('span');
        charSpan.className = 'flap-char';
        charSpan.textContent = char;
        cell.appendChild(charSpan);
      }
      
      row.appendChild(cell);
    });

    return row;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
        }

        .card-header {
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
          color: #ffa500;
          padding: 16px;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 4px;
          border-radius: 8px 8px 0 0;
          font-family: 'Courier New', monospace;
          box-shadow: inset 0 -2px 4px rgba(0,0,0,0.3);
        }

        .header-row {
          display: flex;
          background: #2a2a2a;
          padding: 8px 12px;
          color: #ffa500;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 2px;
          font-family: 'Courier New', monospace;
          border-bottom: 2px solid #444;
        }

        .header-cell {
          flex-shrink: 0;
          padding: 0 4px;
        }

        .flight-board {
          background: #1a1a1a;
          border-radius: 0 0 8px 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .flight-row {
          display: flex;
          padding: 4px 12px;
          border-bottom: 1px solid #333;
          min-height: 48px;
          align-items: center;
          background: linear-gradient(180deg, #222 0%, #1a1a1a 100%);
        }

        .flight-row:last-child {
          border-bottom: none;
        }

        .flight-row:hover {
          background: linear-gradient(180deg, #2a2a2a 0%, #222 100%);
        }

        .flight-cell {
          display: flex;
          flex-shrink: 0;
          gap: 2px;
          padding: 0 4px;
        }

        .flap-char {
          display: inline-block;
          width: 12px;
          height: 32px;
          line-height: 32px;
          text-align: center;
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 48%, #0a0a0a 52%, #1a1a1a 100%);
          color: #e8e8e8;
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          border-radius: 2px;
          box-shadow: 
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            0 1px 2px rgba(0,0,0,0.3);
          position: relative;
          transition: transform 0.1s ease;
        }

        .flap-char:before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(0,0,0,0.6);
          box-shadow: 0 1px 0 rgba(255,255,255,0.05);
        }

        .flap-char.flipping {
          animation: flip 800ms ease-in-out;
        }

        @keyframes flip {
          0% {
            transform: scaleY(1);
          }
          25% {
            transform: scaleY(0.8);
            filter: brightness(1.2);
          }
          50% {
            transform: scaleY(0.1);
            filter: brightness(1.5);
          }
          75% {
            transform: scaleY(0.8);
            filter: brightness(1.2);
          }
          100% {
            transform: scaleY(1);
          }
        }

        .no-flights {
          padding: 40px;
          text-align: center;
          color: #666;
          font-family: 'Courier New', monospace;
        }
      </style>

      <div class="card-header">${this.config.title}</div>
      <div class="header-row">
        <div class="header-cell" style="width: 60px">ZEIT</div>
        <div class="header-cell" style="width: 100px">FLUG</div>
        <div class="header-cell" style="width: 180px">VON</div>
        <div class="header-cell" style="width: 130px">STATUS</div>
        <div class="header-cell" style="width: 140px">FLUGZEUG</div>
      </div>
      <div class="flight-board"></div>
    `;

    if (this.displayedFlights.length > 0) {
      this.renderFlightBoard();
    }
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('flightradar24-splitflap-card', FlightRadar24SplitFlapCard);

// Für das UI
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'flightradar24-splitflap-card',
  name: 'FlightRadar24 Split-Flap Card',
  description: 'Flughafen-Anzeigetafel mit Split-Flap-Animation'
});
