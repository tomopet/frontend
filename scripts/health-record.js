/**
 * ============================================================
 * TOMOPET | scripts/health-record.js
 * 건강기록 대시보드 페이지 JS
 * ============================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  HealthRecordApp.init();
});

const HealthRecordApp = {
  chartInstance: null,
  currentPetId: '1',

  elements: {
    petSelect: document.getElementById('pet-select'),
    openDialogBtn: document.getElementById('open-record-dialog'),
    emptyAddBtn: document.getElementById('empty-add-record'),
    recordDialog: document.getElementById('record-dialog'),
    closeDialogBtn: document.getElementById('close-record-dialog'),
    cancelDialogBtn: document.getElementById('cancel-record'),
    healthForm: document.getElementById('health-form'),
    recordList: document.getElementById('health-record-list'),
    recordEmpty: document.getElementById('health-record-empty'),
    recordFilter: document.getElementById('record-filter'),
    periodTabs: document.querySelectorAll('.period-tab'),

    // 요약 표시용
    latestDate: document.getElementById('latest-date'),
    latestWeight: document.getElementById('latest-weight'),
    latestCalories: document.getElementById('latest-calories'),
    latestPoop: document.getElementById('latest-poop-container'),
    latestCondition: document.getElementById('latest-condition-container'),

    // 이상 징후 알림
    alertBox: document.getElementById('health-alert-box'),
    alertText: document.getElementById('health-alert-text'),
    alertChip: document.getElementById('health-alert-chip'),
  },

  init() {
    this.bindEvents();
    this.initChart();
    this.loadData(this.currentPetId);

    // 오늘 날짜 기본 세팅
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('record-date');
    if (dateInput) dateInput.value = today;
  },

  bindEvents() {
    // 펫 선택
    this.elements.petSelect?.addEventListener('change', (e) => {
      this.currentPetId = e.target.value;
      this.loadData(this.currentPetId);
    });

    // 모달 제어 (<dialog> 네이티브 API)
    this.elements.openDialogBtn?.addEventListener('click', () => this.openDialog());
    this.elements.emptyAddBtn?.addEventListener('click', () => this.openDialog());
    this.elements.closeDialogBtn?.addEventListener('click', () => this.closeDialog());
    this.elements.cancelDialogBtn?.addEventListener('click', () => this.closeDialog());

    // 폼 저장
    this.elements.healthForm?.addEventListener('submit', (e) => this.handleFormSubmit(e));

    // 기록 필터링
    this.elements.recordFilter?.addEventListener('change', (e) => {
      this.filterRecords(e.target.value);
    });

    // 차트 기간 탭
    this.elements.periodTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        this.elements.periodTabs.forEach((btn) => btn.classList.remove('is-active'));
        e.target.classList.add('is-active');
        const period = e.target.dataset.period;
        this.updateChartPeriod(period);
      });
    });
  },

  /**
   * Chart.js 초기화
   */
  initChart() {
    const ctx = document.getElementById('weight-chart')?.getContext('2d');
    if (!ctx || typeof Chart === 'undefined') return;

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1주전', '2주전', '3주전', '4주전', '5주전', '6주전', '7주전', '최근'],
        datasets: [{
          label: '체중 (kg)',
          data: [5.8, 5.7, 5.7, 5.6, 5.5, 5.5, 5.4, 5.4],
          borderColor: '#F2701F',
          backgroundColor: 'rgba(242, 112, 31, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#F2701F'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            suggestedMin: 4.5,
            suggestedMax: 6.5
          }
        }
      }
    });
  },

  /**
   * 데이터 로드 (모의 API 통신)
   */
  async loadData(petId) {
    // 0.5초 대기 후 데이터 바인딩
    setTimeout(() => {
      const mockData = this.getMockData(petId);
      this.renderSummary(mockData.latest);
      this.renderRecords(mockData.records);
      this.renderAlert(mockData.alert);
    }, 500);
  },

  renderSummary(latest) {
    if (!latest) return;
    this.elements.latestDate.textContent = latest.date;
    this.elements.latestWeight.textContent = `${latest.weight} kg`;
    this.elements.latestCalories.textContent = `${latest.calories} kcal`;
    this.elements.latestPoop.innerHTML = `<span class="status-chip ${latest.poop === '정상' ? 'status-chip--normal' : 'status-chip--caution'}">${latest.poop}</span>`;
    this.elements.latestCondition.innerHTML = `<span class="status-chip ${latest.condition === '양호' ? 'status-chip--normal' : 'status-chip--caution'}">${latest.condition}</span>`;
  },

  renderRecords(records) {
    const { recordList, recordEmpty } = this.elements;
    if (!recordList) return;

    if (!records || records.length === 0) {
      recordList.innerHTML = '';
      recordEmpty.hidden = false;
      return;
    }

    recordEmpty.hidden = true;
    recordList.innerHTML = records.map((item) => `
      <tr data-status="${item.status}">
        <td>${item.date}</td>
        <td><strong>${item.weight} kg</strong></td>
        <td>${item.calories} kcal</td>
        <td><span class="status-chip ${item.poop === '정상' ? 'status-chip--normal' : 'status-chip--caution'}">${item.poop}</span></td>
        <td><span class="status-chip ${item.condition === '양호' ? 'status-chip--normal' : 'status-chip--caution'}">${item.condition}</span></td>
      </tr>
    `).join('');
  },

  renderAlert(alert) {
    const { alertBox, alertText, alertChip } = this.elements;
    if (!alertBox) return;

    if (alert.isCaution) {
      alertBox.classList.add('is-caution');
      alertChip.className = 'status-chip status-chip--caution';
      alertChip.textContent = '주의';
    } else {
      alertBox.classList.remove('is-caution');
      alertChip.className = 'status-chip status-chip--normal';
      alertChip.textContent = '정상';
    }
    alertText.textContent = alert.message;
  },

  filterRecords(filterType) {
    const rows = this.elements.recordList?.querySelectorAll('tr');
    rows?.forEach((row) => {
      const status = row.dataset.status;
      if (filterType === 'all' || status === filterType) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  },

  updateChartPeriod(weeks) {
    if (!this.chartInstance) return;
    const labels = Array.from({ length: Number(weeks) }, (_, i) => `${weeks - i}주전`);
    labels[labels.length - 1] = '최근';

    // 가상의 체중 데이터 생성
    const data = Array.from({ length: Number(weeks) }, () => (5.2 + Math.random() * 0.5).toFixed(1));

    this.chartInstance.data.labels = labels;
    this.chartInstance.data.datasets[0].data = data;
    this.chartInstance.update();
  },

  openDialog() {
    this.elements.recordDialog?.showModal();
  },

  closeDialog() {
    this.elements.recordDialog?.close();
  },

  handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newRecord = {
      date: formData.get('date'),
      weight: formData.get('weight'),
      poop: formData.get('poop'),
      condition: formData.get('condition'),
      calories: '320', // 기본 가상값
      status: formData.get('poop') === '정상' && formData.get('condition') === '양호' ? 'normal' : 'caution'
    };

    // 테이블 상단에 새 모의 데이터 추가
    const tr = document.createElement('tr');
    tr.dataset.status = newRecord.status;
    tr.innerHTML = `
      <td>${newRecord.date}</td>
      <td><strong>${newRecord.weight} kg</strong></td>
      <td>${newRecord.calories} kcal</td>
      <td><span class="status-chip ${newRecord.poop === '정상' ? 'status-chip--normal' : 'status-chip--caution'}">${newRecord.poop}</span></td>
      <td><span class="status-chip ${newRecord.condition === '양호' ? 'status-chip--normal' : 'status-chip--caution'}">${newRecord.condition}</span></td>
    `;

    this.elements.recordList?.prepend(tr);
    this.elements.recordEmpty.hidden = true;
    this.closeDialog();

    if (window.TomopetUi?.showToast) {
      window.TomopetUi.showToast('새 건강 기록이 등록되었습니다.');
    } else {
      alert('새 건강 기록이 등록되었습니다.');
    }
  },

  getMockData(petId) {
    if (petId === '2') {
      return {
        latest: { date: '2026.07.23', weight: '3.2', calories: '210', poop: '묽음', condition: '보통' },
        records: [
          { date: '2026.07.23', weight: '3.2', calories: '210', poop: '묽음', condition: '보통', status: 'caution' },
          { date: '2026.07.16', weight: '3.3', calories: '220', poop: '정상', condition: '양호', status: 'normal' }
        ],
        alert: { isCaution: true, message: '최근 배변 상태가 묽음으로 기록되었습니다.' }
      };
    }

    return {
      latest: { date: '2026.07.24', weight: '5.4', calories: '350', poop: '정상', condition: '양호' },
      records: [
        { date: '2026.07.24', weight: '5.4', calories: '350', poop: '정상', condition: '양호', status: 'normal' },
        { date: '2026.07.17', weight: '5.5', calories: '340', poop: '정상', condition: '양호', status: 'normal' },
        { date: '2026.07.10', weight: '5.5', calories: '330', poop: '딱딱함', condition: '보통', status: 'caution' }
      ],
      alert: { isCaution: false, message: '모든 수치가 정상 범위를 유지하고 있습니다.' }
    };
  }
};