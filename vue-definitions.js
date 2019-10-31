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

    findSlope(spectrum, i) {
      // central difference version of derivative
      return (spectrum.amp[i + 1] - spectrum.amp[i - 1])/((spectrum.freq[i + 1] - spectrum.freq[i - 1]));
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
          y: this.findSlope(this.spectrum, i)
        };

        let p2 = {
          x: this.spectrum.freq[i + 1],
          y: this.findSlope(this.spectrum, i + 1)
        };

        if (p1.y >= 0 && p2.y < 0)
        {

          let secondDerivative = (p2.y - p1.y) / (p2.x - p1.x)

          // filter for peaks with slope steeper than cutoff
          if (secondDerivative < -this.slopeCutoff/1000)
          {

            let peakFreq = this.spectrum.amp[i] > this.spectrum.amp[i + 1] ? p1.x : p2.x;
            let peakAmp = this.spectrum.amp[i] > this.spectrum.amp[i + 1] ? this.spectrum.amp[i] : this.spectrum.amp[i + 1];

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

    slopeCutoff: 5,

    minFreq: 100,

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
