/**
 * 웹사이트 주요 기능 로직
 * 1. 탭 스위칭
 * 2. 페럴랙스 효과
 * 3. 모바일 하단바 제어
 * 4. 앵커 스무스 스크롤
 * 5. 예약 폼 전송 (Solapi API)
 */

// 1. 탭 스위칭 로직
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-buttons button');
    if (!btn) return;
    const tabs = btn.closest('.tabs');
    const id = btn.dataset.tab;
    
    // 버튼 활성화 상태 변경
    tabs.querySelectorAll('.tab-buttons button').forEach(b => b.classList.toggle('active', b === btn));
    // 컨텐츠 패널 표시 변경
    tabs.querySelectorAll('.tab-contents .pane').forEach(p => p.classList.toggle('active', p.dataset.pane === id));
});

// 2. 페럴랙스 효과 (데스크탑 전용)
const heroImg = document.querySelector('.parallax');
if (heroImg && window.matchMedia('(min-width: 821px)').matches) {
    window.addEventListener('scroll', () => {
        const y = window.scrollY * 0.05;
        heroImg.style.transform = `translateY(${y}px)`;
    }, { passive: true });
}

// 3. 모바일 하단바(CTA) 노출 로직
const mobileCta = document.querySelector('.mobile-cta');
if (mobileCta) { 
    // 페이지 로드 후 살짝 지연을 주어 자연스럽게 표시 (CSS에 .show 관련 스타일이 있을 경우)
    setTimeout(() => {
        mobileCta.classList.add('show', 'fade-in');
    }, 200);
}

// 4. 앵커 스무스 스크롤
document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});

// 5. 예약 폼 및 기타 초기화 로직                       
const SITE_NAME = "월드 메르디앙";
const API_BASE = "https://solapi-backend.onrender.com";
const ADMIN_PHONE = "01043597772";

document.addEventListener('DOMContentLoaded', function () {
    // 방문일 선택 라이브러리 (flatpickr)
    if (typeof flatpickr !== 'undefined') {
        flatpickr('#visit-date', { 
            locale: 'ko', 
            dateFormat: 'Y-m-d', 
            defaultDate: new Date(), 
            disableMobile: true 
        });
    }

    const timeWrap = document.querySelector('.time-wrap');
    const dispInput = document.getElementById('visit-time-display');
    const hiddenTime = document.getElementById('visit-time');
    const dd = document.getElementById('time-dropdown');

    const hideDD = () => { 
        if (dd) dd.classList.remove('open'); 
        if (dispInput) dispInput.setAttribute('aria-expanded', 'false'); 
    };

    if (dispInput) {
        dispInput.addEventListener('click', e => { 
            e.stopPropagation(); 
            if (dd) dd.classList.toggle('open'); 
        });
    }

    if (dd) {
        dd.addEventListener('click', e => {
            const btn = e.target.closest('.slot');
            if (!btn) return;
            dd.querySelectorAll('.slot').forEach(s => s.removeAttribute('aria-selected'));
            btn.setAttribute('aria-selected', 'true');
            dispInput.value = btn.textContent.trim();
            hiddenTime.value = btn.dataset.value;
            hideDD();
        });
    }

    document.addEventListener('click', e => { 
        if (timeWrap && !timeWrap.contains(e.target)) hideDD(); 
    });

    // 폼 제출 로직
    const form = document.getElementById('reservation');
    const submitBtn = document.getElementById('submitBtn');
    const checkbox = document.querySelector('.form-contents-privacy-checkbox');
    const dateInput = document.getElementById('visit-date');

    const normalizePhone = v => (v || '').replace(/[^\d]/g, '');
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    if (checkbox && submitBtn) {
        checkbox.addEventListener('change', () => { 
            submitBtn.disabled = !checkbox.checked; 
        });
    }

    if (form) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            if (!checkbox || !checkbox.checked) { 
                alert('개인정보 수집 및 이용에 동의해야 합니다.'); 
                return; 
            }

            const name = form.elements.name.value.trim();
            const phone = normalizePhone(form.elements.phone.value);
            const vd = dateInput ? dateInput.value.trim() : '';
            const vt = hiddenTime ? hiddenTime.value.trim() : '';
            const vtLabel = dispInput ? (dispInput.value || '').trim() : '';

            if (!name) { alert('성함을 입력해 주세요.'); return; }
            if (!(phone.length === 10 || phone.length === 11)) { 
                alert('연락처를 정확히 입력해 주세요.'); 
                return; 
            }
            if (!vd) { alert('방문일을 선택해 주세요.'); return; }
            if (!vt) { alert('방문 시간을 선택해 주세요.'); return; }

            const payload = { site: SITE_NAME, vd, vtLabel, name, phone, adminPhone: ADMIN_PHONE, memo: '' };

            submitBtn.disabled = true;
            const prev = submitBtn.textContent;
            submitBtn.textContent = '전송 중…';

            try {
                const res = await fetch(`${API_BASE}/sms`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const txt = await res.text();
                let data = null;
                try { data = JSON.parse(txt); } catch {}
                
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                
                await sleep(200);
                alert(`${name}님, 방문예약 요청이 전송되었습니다!`);
                form.reset();
                if (hiddenTime) hiddenTime.value = '';
                if (dispInput) dispInput.value = '';
            } catch (err) {
                alert(`전송 실패: 잠시 후 다시 시도해 주세요.`);
                console.error(err);
            } finally {
                submitBtn.textContent = prev;
                submitBtn.disabled = !checkbox.checked;
            }
        });
    }

    // 서버 버전 체크
    fetch(`${API_BASE}/version`)
        .then(r => r.json())
        .then(v => console.log('API Status:', v.from_admin ? 'Connected' : 'Disconnected'))
        .catch(() => {});
});