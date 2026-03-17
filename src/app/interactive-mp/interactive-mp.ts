import { Component, OnInit, AfterViewInit } from '@angular/core';
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
export class InteractiveMp implements OnInit, AfterViewInit {
  private map!: L.Map;
  private markerGroup = L.featureGroup();
  private allRestaurants: any[] = [];
  private activeFilters: Set<string> = new Set();

  // UI State
  public tourActive = false;
  public showModal = false;
  public showConfirmModal = false;
  public selectedRestaurant = '';
  public tourCodeInput = '';

  private categoryColors: Record<string, string> = {
    'Italian': '#c0392b',
    'Spanish': '#4a6fa5',
    'Indian': '#3a8c5c',
    'Default': '#b07d4a',
    'Cambodian and French': '#8e44ad'
  };

  constructor(private http: HttpClient, private supabaseService: SupabaseService) {}

  ngOnInit() {
    // Check status in OnInit to prevent ExpressionChanged errors
    // Use setTimeout to ensure the check happens in the next macrotask
    setTimeout(() => {
      this.tourActive = this.isTourActive();
    }, 0);
  }

  ngAfterViewInit() {
    this.initMap();
    this.loadPolygonsAndData();
  }

  // --- TOUR LOGIC & MODALS ---

  private isTourActive(): boolean {
    const savedCode = localStorage.getItem('active_tour_code');
    const savedDate = localStorage.getItem('tour_activation_date');
    const todayDate = new Date().toLocaleDateString();
    const todayDay = new Date().getDate();
    const expectedCode = `BOSTON${todayDay}`;
    return savedCode === expectedCode && savedDate === todayDate;
  }

  public openUnlockModal() {
    this.showModal = true;
  }

  public closeModal() {
    this.showModal = false;
    this.tourCodeInput = '';
  }

  public verifyCode() {
    const todayDay = new Date().getDate();
    const expected = `BOSTON${todayDay}`;

    if (this.tourCodeInput.toUpperCase() === expected) {
      localStorage.setItem('active_tour_code', expected);
      localStorage.setItem('tour_activation_date', new Date().toLocaleDateString());
      this.tourActive = true;
      this.showModal = false;
      this.refreshMarkers(); 
    } else {
      alert("Invalid code. Please check with your guide!");
    }
  }

  // --- REDEMPTION LOGIC ---

  public triggerRedeem(name: string) {
    this.selectedRestaurant = name;
    this.showConfirmModal = true;
  }

  public confirmRedeem() {
    // Logic to redirect or show QR
    console.log(`Navigating to QR for: ${this.selectedRestaurant}`);
    alert(`Generating QR for ${this.selectedRestaurant}...`);
    this.showConfirmModal = false;
  }

  // --- MAP CORE ---

  private initMap() {
    this.map = L.map('map', { zoomControl: false }).setView([42.36, -71.06], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(this.map);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
  }

  private async loadPolygonsAndData() {
    // Districts
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

    // Restaurants
    this.allRestaurants = await this.supabaseService.getRestaurants();
    const styles = Array.from(new Set(this.allRestaurants.map(r => r.Style || 'Default')));
    styles.forEach(s => this.activeFilters.add(s));

    this.createLegend(styles);
    this.refreshMarkers();
  }

  public refreshMarkers() {
    this.markerGroup.clearLayers();
    
    // Global Bridge for Leaflet Popups
    (window as any).mapComponent = this;

    this.allRestaurants.forEach(res => {
      if (res.Latitude && res.Longitude && this.activeFilters.has(res.Style || 'Default')) {
        const marker = L.marker([res.Latitude, res.Longitude], {
          icon: this.createForkIcon(res.Style || 'Default')
        });

        // Use a backslash for escaping single quotes in restaurant names
        const safeName = res.REST_NAME.replace(/'/g, "\\'");

        const popupContent = `
          <div style="text-align: center; font-family: 'DM Sans', sans-serif; min-width: 150px;">
            <strong style="font-size: 15px; color: #333;">${res.REST_NAME}</strong>
            <p style="margin: 4px 0 10px 0; color: #666; font-size: 13px;">${res.Style}</p>
            
            ${res.Link_web ? `
              <a href="${res.Link_web}" target="_blank" style="display: inline-block; margin-bottom: 10px; color: #2980b9; text-decoration: none; font-size: 13px; font-weight: 500;">
                Visit Website ↗
              </a>` : ''
            }

            <div style="margin-top: 5px; border-top: 1px solid #eee; padding-top: 10px;">
              ${this.tourActive 
                ? `<button onclick="window.mapComponent.triggerRedeem('${safeName}')" 
                    style="background: #27ae60; color: white; border: none; padding: 10px; border-radius: 6px; width: 100%; cursor: pointer; font-weight: bold; font-family: 'DM Sans';">
                    🎟️ Get QR Code
                   </button>`
                : `<div style="background: #f1f5f9; color: #64748b; padding: 8px; border-radius: 6px; font-size: 11px;">
                    🔒 Unlock with Tour Code for Discount
                   </div>`
              }
            </div>
          </div>
        `;

        marker.bindPopup(popupContent).addTo(this.markerGroup);
      }
    });

    this.markerGroup.addTo(this.map);
  }

  private createLegend(styles: string[]) {
    const legend = new (L.Control.extend({ options: { position: 'topright' } }));
    
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'map-legend');
      div.innerHTML = '<h4>Filter Cuisine</h4>';
      
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
      return div;
    };
    legend.addTo(this.map);
  }

  private createForkIcon(style: string): L.DivIcon {
    const color = this.categoryColors[style] || this.categoryColors['Default'];
    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; width: 34px; height: 34px;">
          <div style="position: absolute; inset: 0; background: ${color}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
          <span style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; padding-bottom: 2px;">🍴</span>
        </div>`,
      iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -36]
    });
  }
}