// custom graph component
Vue.component('graph', {

  props: ['traces', 'layout'],

  template: '<div ref="graph" class="graph" style="width: 700px; height: 700px;"></div>',

  methods: {

    makeGraph() {
      Plotly.newPlot(this.$refs.graph, this.traces, this.layout);
    },

  },

  mounted() {
    this.makeGraph();
  },

  watch: {
    traces() {
      this.makeGraph();
    }
  }


})

// global data
let app = new Vue({

  el: '#root',

  methods: {

    // file reader using this tutorial: https://alligator.io/vuejs/file-reader-component/
    loadTextFromFile(ev) {
      const file = ev.target.files[0];
      const reader = new FileReader();

      reader.onload = e => {
        if (file.type == 'text/plain') {
          console.log('text loaded');
          this.text = e.target.result;
        } else {
          console.log('file was not a text file');
        }
      };

      reader.readAsText(file);
    },

    smoothSlope(array, index) {
      return (this.findSlope(array,index-2) + 2 * this.findSlope(array,index-1) + 3 * this.findSlope(array,index) + 2*this.findSlope(array,index+1) + this.findSlope(array,index+2))/9;
    },

    findSlope(array, index) {
      return array[index+2] - array[index-2];
    },

  },

  computed: {

    spectrum() {

      let spectrumData = this.text.split('\r') // break newlines
        .map(row => row.split('\t')) // tab separated
        .filter(e => e.length == 2); // filter out rows that don't have 2 entries (i.e. empty rows)

      let header = spectrumData.shift();

      let freq = spectrumData.map(e => parseFloat(e[0]));
      let amp = spectrumData.map(e => parseFloat(e[1]));

      // filter frequencies beyond cutoff
      freq = freq.filter(e => e <= this.maxFreq);
      amp = amp.filter((e,i) => freq[i] <= this.maxFreq);

      return {
        freq: freq,
        amp: amp
      }
    },

    peaks() {


      return {
        freq: freq,
        amp: amp
      }
    },

    spectrumTrace() {

      return {
        x: this.spectrum.freq,
        y: this.spectrum.amp,
        type: 'scatter',
        mode: 'lines',
      }
    },

    peaks() {

      let peaks = {
        freq: [],
        amp: []
      };

      for (i = 1; i < this.spectrum.freq.length; i++)
      {

        // calculate derivative
        let p1 = {
          x: this.spectrum.freq[i],
          y: this.smoothSlope(this.spectrum.amp, i)
        };

        let p2 = {
          x: this.spectrum.freq[i+1],
          y: this.smoothSlope(this.spectrum.amp, i+1)
        };

        if (p1.y >= 0 && p2.y < 0)
        {

          // linearly interpolate derivative to find frequency where derivative crosses zero
          let secondDerivative = (p2.y - p1.y) / (p2.x - p1.x);
          //let peakFreq = p1.x + (0 - p1.y) / secondDerivative;

          // filter for peaks with slope steeper than cutoff
          if (secondDerivative < this.slopeCutoff)
          {

            let peakFreq = this.spectrum.amp[i] > this.spectrum.amp[i + 1] ? p1.x : p2.x;
            let peakAmp = this.spectrum.amp[i] > this.spectrum.amp[i + 1] ? this.spectrum.amp[i] : this.spectrum.amp[i + 1];

            // linearly interpolate FFT to find energy where derivative crosses zero
            //let slope = (this.spectrum.amp[i + 1] - this.spectrum.amp[i])/(p2.x - p1.x);
            //let peakAmp = this.spectrum.amp[i] + slope * (peakFreq - p1.x);

            peaks.freq.push(peakFreq);
            peaks.amp.push(peakAmp);

          }
        }
      }

      return peaks;

    },

    peakTrace() {

      return {
        x: this.peaks.freq,
        y: this.peaks.amp,
        type: 'scatter',
        mode: 'markers',
        marker: {
          color: 'rgb(128, 0, 0)',
          size: 10
        },
      }
    },

    peakTable() {
      let table = [];

      for (let i = 0; i < this.peaks.freq.length; i++) {
        table.push({
          freq: Math.round(100 * this.peaks.freq[i]) / 100,
          amp: Math.round(100 * this.peaks.amp[i]) / 100,
        })
      }

      return table;

    }

  },


  data: {

    slopeCutoff: 0,

    maxFreq: 5000,

    text: "",

    layout: {

      xaxis: {
        title: 'Frequency (Hz)',
        type: 'log'
      },

      yaxis: {
        title: 'Loudness (dB)',
       },

      font: {
        family: 'Open Sans',
        size: 18,
        color: '#7f7f7f'
      },

      showlegend: false,
    },



  }

})
