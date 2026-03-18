import { Component, AfterViewInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import * as L from 'leaflet';

@Component({
  selector: 'interactive-mp',
  standalone: true,
  imports: [HttpClientModule, CommonModule, FormsModule],
  templateUrl: './interactive-mp.html',
  styleUrls: ['./interactive-mp.css']
})
export class InteractiveMp implements AfterViewInit {
  private map!: L.Map;
  private markerGroup = L.featureGroup();
  private musicGroup = L.featureGroup(); // 🎷 music markers
  private tourGroup = L.featureGroup(); // 🎷 tour markers
  private allRestaurants: any[] = [];
  private allMusic: any[] = [];
  private allTours: any[] = [];
  private activeFilters: Set<string> = new Set();

  private showMusic: boolean = true; // 🎷 toggle state
  public selectedRestaurant = '';

  private categoryColors: Record<string, string> = {
    'Italian': '#c0392b',
    'Spanish': '#4a6fa5',
    'Indian': '#3a8c5c',
    'Default': '#b07d4a',
    'Cambodian and French': '#8e44ad'
  };

    private musicColors: Record<string, string> = {
    'Jan Plays the Sax': '#ff9900',
    'Music Places': '#a55c4a'
  };

  private tourColors: Record<string, string> = {
    'Boston Free Tour': '#00aeff',
    'Harvard Tour': '#00aeff'
  };
  constructor(private http: HttpClient, private supabaseService: SupabaseService) {}

  ngAfterViewInit() {
    this.initMap();
    this.loadPolygonsAndData();
  }

  // ---------------- MAP INIT ----------------
  private initMap() {
    this.map = L.map('map', { zoomControl: false }).setView([42.36, -71.06], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
  }

  // ---------------- LOAD DATA ----------------
  private async loadPolygonsAndData() {
    this.http.get('/Planning_Districts_Boston.json').subscribe(geoData => {
      L.geoJSON(geoData as any, {
        style: { color: '#8a9bb5', weight: 1.5, fillOpacity: 0.1, fillColor: '#c8d4e8' },
        onEachFeature: (feature, layer) => {
          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({ fillOpacity: 0.3, weight: 3, color: '#5a7a9e', fillColor: '#a8bbd4' });
              l.bindTooltip(feature.properties?.PD || 'District', { sticky: true }).openTooltip();
            },
            mouseout: (e) => {
              const l = e.target;
              l.setStyle({ fillOpacity: 0.1, weight: 1.5, color: '#8a9bb5', fillColor: '#c8d4e8' });
              l.closeTooltip();
            }
          });
        }
      }).addTo(this.map);
    });

    // Restaurants from Supabase
    this.allRestaurants = await this.supabaseService.getRestaurants();
    const styles = Array.from(new Set(this.allRestaurants.map(r => r.Style || 'Default')));
    styles.forEach(s => this.activeFilters.add(s));

    // Music from Supabase
    this.allMusic = await this.supabaseService.getMusic();
    const styles2 = Array.from(new Set(this.allMusic.map(m => m.Place_Name || 'Default')));
    styles2.forEach(s => this.activeFilters.add(s));

    // Tours from Supabase
    this.allTours = await this.supabaseService.getTours();
    const styles3 = Array.from(new Set(this.allTours.map(t => t.TOUR_NAME || 'Default')));
    styles3.forEach(s => this.activeFilters.add(s));

    this.createLegend(styles, styles2, styles3);
    this.refreshMarkers();
  }

  // ---------------- MARKERS ----------------
  public refreshMarkers() {
    this.markerGroup.clearLayers();
    this.musicGroup.clearLayers();
    this.tourGroup.clearLayers();

    (window as any).mapComponent = this;

    // 🍽️ Restaurant markers
    this.allRestaurants.forEach(res => {
      if (res.Latitude && res.Longitude && this.activeFilters.has(res.Style || 'Default')) {
        const marker = L.marker([res.Latitude, res.Longitude], {
          icon: this.createForkIcon(res.Style || 'Default')
        });

        const popupContent = `
          <div style="
            font-family: 'DM Sans', sans-serif;
            min-width: 220px;
            max-width: 260px;
            padding: 14px;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 6px 18px rgba(0,0,0,0.15);
            text-align: center;
          ">
            <div style="margin-bottom: 6px;">
              <strong style="font-size: 16px; color: #222;">${res.REST_NAME}</strong>
            </div>
            <div style="font-size: 13px; color: #777; margin-bottom: 12px;">${res.Style}</div>

            ${res.Link_web ? `
              <a href="${res.Link_web}" target="_blank" style="
                display: inline-block; margin-bottom: 8px; padding: 6px 12px;
                border-radius: 6px; background: #f1f5f9; color: #2980b9;
                text-decoration: none; font-size: 13px; font-weight: 500;
              ">🌐 Visit Website</a>
            ` : ''}

            ${res.GM_Link ? `
              <div style="margin-top: 6px;">
                <a href="${res.GM_Link}" target="_blank" style="
                  display: inline-block; padding: 8px 14px; border-radius: 8px;
                  border: 1px solid #34a853; background: #e6f4ea;
                  color: #1e7e34; text-decoration: none; font-size: 13px; font-weight: 600;
                ">📍 Open in Maps</a>
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent).addTo(this.markerGroup);
      }
    });

    // 🍽️ TOURS markers
    this.allTours.forEach(tour => {
      if (tour.Latitude && tour.Longitude && this.activeFilters.has(tour.TOUR_NAME)) {
        const marker = L.marker([tour.Latitude, tour.Longitude], {
          icon: this.createTourIcon(tour.TOUR_NAME)
        });

        const popupContentTours = `
          <div style="
            font-family: 'DM Sans', sans-serif;
            min-width: 220px;
            max-width: 260px;
            padding: 14px;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 6px 18px rgba(0,0,0,0.15);
            text-align: center;
          ">
            <div style="margin-bottom: 6px;">
              <strong style="font-size: 16px; color: #222;">${tour.TOUR_NAME}</strong>
            </div>
            <div style="font-size: 13px; color: #777; margin-bottom: 12px;">${tour.STARTING_TIME}</div>

            ${tour.LINK_TOUR ? `
              <a href="${tour.LINK_TOUR}" target="_blank" style="
                display: inline-block; margin-bottom: 8px; padding: 6px 12px;
                border-radius: 6px; background: #f1f5f9; color: #2980b9;
                text-decoration: none; font-size: 13px; font-weight: 500;
              ">✅ Book Now</a>
            ` : ''}

            ${tour.GM_tours_link ? `
              <div style="margin-top: 6px;">
                <a href="${tour.GM_tours_link}" target="_blank" style="
                  display: inline-block; padding: 8px 14px; border-radius: 8px;
                  border: 1px solid #34a853; background: #e6f4ea;
                  color: #1e7e34; text-decoration: none; font-size: 13px; font-weight: 600;
                ">📍 Open in Maps</a>
              </div>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContentTours).addTo(this.tourGroup);
      }
    });

    // 🎷 Music markers
this.allMusic.forEach(music => {
  const placeName = music.Place_Name || 'Unknown';
  if (music.Latitude && music.Longitude && this.activeFilters.has(placeName)) {
    const marker = L.marker([music.Latitude, music.Longitude], {
      icon: this.createSaxIcon(placeName)
    });
     const popupContentMusic = `
          <div style="
            font-family: 'DM Sans', sans-serif;
            min-width: 220px;
            max-width: 260px;
            padding: 14px;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 6px 18px rgba(0,0,0,0.15);
            text-align: center;
          ">
            <div style="margin-bottom: 6px;">
              <strong style="font-size: 16px; color: #222;">${music.Place_Name}</strong>
            </div>
            ${music.Youtube ? `
              <a href="${music.Youtube}" target="_blank" style="
                display: inline-block; margin-bottom: 8px; padding: 6px 12px;
                border-radius: 6px; background: #ff0000; color: #ffffff;
                text-decoration: none; font-size: 13px; margin-top: 6px; font-weight: 500;
              ">YouTube</a>
            ` : ''}
              <br>
            ${music.Instagram ? `
              <a href="${music.Instagram}" target="_blank" style="
                display: inline-block; margin-bottom: 8px; padding: 6px 12px;
                border-radius: 6px; background: #ff1bb3; color: #e6e6e6;
                text-decoration: none; font-size: 13px; margin-top: 6px; font-weight: 500;
              ">Instagram</a>
            ` : ''}

            ${music.GM_music_Link ? `
              <div style="margin-top: 6px;">
                <a href="${music.GM_music_Link}" target="_blank" style="
                  display: inline-block; padding: 8px 14px; border-radius: 8px;
                  border: 1px solid #34a853; background: #e6f4ea;
                  color: #1e7e34; text-decoration: none; font-size: 13px; font-weight: 600;
                ">📍 Open in Maps</a>
              </div>
            ` : ''}
          </div>
        `;
    marker.bindPopup(popupContentMusic).addTo(this.musicGroup);
  }
});

  // Add restaurant markers
  this.markerGroup.addTo(this.map);
   // Add tour markers
  this.tourGroup.addTo(this.map);
  // Add music markers if toggle is on
  if (this.showMusic) {
    this.musicGroup.addTo(this.map);
  }
}

  // ---------------- LEGEND ----------------
private createLegend(styles: string[], styles2: string[], styles3: string[]) {
  const legend = new (L.Control.extend({ options: { position: 'topright' } }));

  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'map-legend');

    // --- Cuisine ---
    const cuisineTitle = L.DomUtil.create('h4', '', div);
    cuisineTitle.innerText = 'Cuisine';

    styles.forEach(style => {
      const item = L.DomUtil.create('div', 'legend-item', div);
      const color = this.categoryColors[style] || this.categoryColors['Default'];
      item.innerHTML = `<span class="color-circle" style="background:${color}"></span>${style}`;
      L.DomEvent.disableClickPropagation(item);

      item.onclick = () => {
        if (this.activeFilters.has(style)) {
          this.activeFilters.delete(style);
          item.classList.add('inactive');
        } else {
          this.activeFilters.add(style);
          item.classList.remove('inactive');
        }
        this.refreshMarkers();
      };
    });

    // --- TOURS ---
    const tourTitle = L.DomUtil.create('h4', '', div);
    tourTitle.innerText = 'Tours';

    styles3.forEach(TOUR_NAME => {
      const item = L.DomUtil.create('div', 'legend-item', div);
      const color = this.tourColors[TOUR_NAME] || '#00aeff';
      item.innerHTML = `<span class="color-circle" style="background:${color}"></span>${TOUR_NAME}`;
      L.DomEvent.disableClickPropagation(item);

      item.onclick = () => {
        if (this.activeFilters.has(TOUR_NAME)) {
          this.activeFilters.delete(TOUR_NAME);
          item.classList.add('inactive');
        } else {
          this.activeFilters.add(TOUR_NAME);
          item.classList.remove('inactive');
        }
        this.refreshMarkers();
      };
    });

    // --- Music ---
    const musicTitle = L.DomUtil.create('h4', '', div);
    musicTitle.style.marginTop = '10px';
    musicTitle.innerText = 'Music';

    styles2.forEach(placeName => {
      const item = L.DomUtil.create('div', 'legend-item', div);
      const color = this.musicColors[placeName] || '#f1c40f'; ;
      item.innerHTML = `<span class="color-circle" style="background:${color}"></span>${placeName}`;
      L.DomEvent.disableClickPropagation(item);

      if (!this.activeFilters.has(placeName)) item.classList.add('inactive');

      item.onclick = () => {
        if (this.activeFilters.has(placeName)) {
          this.activeFilters.delete(placeName);
          item.classList.add('inactive');
        } else {
          this.activeFilters.add(placeName);
          item.classList.remove('inactive');
        }
        this.refreshMarkers();
      };
    });

    return div; 
  };

  // Add legend to map
  legend.addTo(this.map);
}
  // ---------------- ICONS ----------------
  private createForkIcon(style: string): L.DivIcon {
    const color = this.categoryColors[style] || this.categoryColors['Default'];
    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; width: 34px; height: 34px;">
          <div style="position: absolute; inset: 0; background: ${color};
            border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white;"></div>
          <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">🍴</span>
        </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -36]
    });
  }

  private createTourIcon(TOUR_NAME: string): L.DivIcon {
    const color_tours = this.tourColors[TOUR_NAME] || this.tourColors['Default'];
    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; width: 34px; height: 34px;">
          <div style="position: absolute; inset: 0; background: ${color_tours};
            border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white;"></div>
          <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">🍴</span>
        </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
      popupAnchor: [0, -36]
    });
  }

  private createSaxIcon(placeName: string): L.DivIcon {
    const color_music = this.musicColors[placeName] ||'#f1c40f';
    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; width: 38px; height: 38px;">
          <div style="
            position: absolute; inset: 0; background: ${color_music};
            border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
            border: 2px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.25);
          "></div>
          <span style="position: absolute; inset: 0; display: flex;
            align-items: center; justify-content: center; font-size: 16px;">🎵</span>
        </div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
      popupAnchor: [0, -40]
    });
  }
}