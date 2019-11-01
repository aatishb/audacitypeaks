// custom graph component
Vue.component('graph', {

  props: ['traces', 'layout'],

  template: '<div ref="graph" class="graph" style="height: 600px;"></div>',

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
          this.text = e.target.result;
        } else {
          alert('Error: Uploaded file was not a text file');
        }
      };

      reader.readAsText(file);
    },

    // https://stackoverflow.com/questions/2044616/select-a-complete-table-with-javascript-to-be-copied-to-clipboard/2044793#2044793
    selectElementContents(el) {
        var body = document.body, range, sel;
        if (document.createRange && window.getSelection) {
            range = document.createRange();
            sel = window.getSelection();
            sel.removeAllRanges();
            try {
                range.selectNodeContents(el);
                sel.addRange(range);
            } catch (e) {
                range.selectNode(el);
                sel.addRange(range);
            }
            document.execCommand("copy");
        } else if (body.createTextRange) {
            range = body.createTextRange();
            range.moveToElementText(el);
            range.select();
            range.execCommand("Copy");
        }

      sel.removeAllRanges();

    },

    copyTable() {
      this.selectElementContents( document.getElementById("dataTable") );

      let tooltip = document.getElementById("myTooltip");
      tooltip.innerHTML = "Table Copied to Clipboard!";

    },

    outFunc() {
      var tooltip = document.getElementById("myTooltip");
      tooltip.innerHTML = "Copy Table to Clipboard";
    },

    // 'no smoothing' formulas: http://mathfaculty.fullerton.edu/mathews/n2003/differentiation/NumericalDiffProof.pdf
    // 'smoothing' formulas: https://en.wikipedia.org/wiki/Savitzky%E2%80%93Golay_filter#Tables_of_selected_convolution_coefficients
    firstDerivative(a, i) {

      if (this.smoothing == 0) {
        return (a[i+1] - a[i-1])/2;
      }

      else if (this.smoothing == 1) {
        return (a[i-2] - 8 * a[i-1] + 8 * a[i+1] - a[i+2])/12;
      }

      else if (this.smoothing == 2) {
        return (22*a[i-3] -67*a[i-2] -58*a[i-1] +58*a[i+1] + 67*a[i+2] -22*a[i+3])/252;
      }

    },

    // 'no smoothing' formulas: http://mathfaculty.fullerton.edu/mathews/n2003/differentiation/NumericalDiffProof.pdf
    // 'smoothing' formulas: https://en.wikipedia.org/wiki/Savitzky%E2%80%93Golay_filter#Tables_of_selected_convolution_coefficients
    secondDerivative(a, i) {
      if (this.smoothing == 0) {
        return a[i+1] - 2*a[i] + a[i-1]
      }

      else if (this.smoothing == 1) {
        return (2*a[i-2] -a[i-1] -2*a[i] -a[i+1] +2*a[i+2])/7;
      }

      else if (this.smoothing == 2) {
        return (5*a[i-3] -3*a[i-1] -4*a[i] -3*a[i+1] +5*a[i+3])/42;
      }


    },


    dbToAmp(dbfs) {
      let currentGain = Math.pow(10, -1 * Math.abs(dbfs)/20);
      return Math.min(currentGain, this.maxGain);
    },

    playTone: function(){
      let T = context.currentTime;
      for (let i = 0; i < this.peaks.freq.length; i++) {
        tone(this.peaks.freq[i], this.dbToAmp(this.peaks.amp[i]), T);
      }
    },

  },

  computed: {

    spectrum() {

      let spectrumData = this.text.split('\r') // break newlines
        .map(row => row.split('\t')) // tab separated
        .filter(e => e.length == 2); // filter out rows that don't have 2 entries (i.e. empty rows)

      let header = spectrumData.shift();

      // filter frequencies within range
      spectrumData = spectrumData
        .filter(e => parseFloat(e[0]) >= this.minFreq)
        .filter(e => parseFloat(e[0]) <= this.maxFreq);

      let freq = spectrumData.map(e => parseFloat(e[0]));
      let amp = spectrumData.map(e => parseFloat(e[1]));

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
          y: this.firstDerivative(this.spectrum.amp, i)
        };

        let p2 = {
          x: this.spectrum.freq[i + 1],
          y: this.firstDerivative(this.spectrum.amp, i + 1)
        };

        if (p1.y >= 0 && p2.y < 0)
        {


          // filter for peaks with slope steeper than cutoff
          if (this.secondDerivative(this.spectrum.amp, i) < -this.slopeCutoff)
          {

            let peakFreq = this.spectrum.amp[i] > this.spectrum.amp[i + 1] ? p1.x : p2.x;
            let peakAmp = this.spectrum.amp[i] > this.spectrum.amp[i + 1] ? this.spectrum.amp[i] : this.spectrum.amp[i + 1];

            if (peakAmp > this.minLoudness) {
              peaks.freq.push(peakFreq);
              peaks.amp.push(peakAmp);
            }

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

    slopeCutoff: 1,

    smoothing: 1,

    minFreq: 100,

    maxFreq: 5000,

    minLoudness: -70,

    maxGain: 0.71, // maximum allowable gain

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
