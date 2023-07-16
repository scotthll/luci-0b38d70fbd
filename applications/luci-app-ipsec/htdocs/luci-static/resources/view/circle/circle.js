'use strict';
'require view';
'require ui';
'require uci';
'require request';

var baseUrl = '/cgi-bin/luci//admin/network/circle';

return view.extend({
    handleSaveApply: null,
    handleReset: null,
    handleSave: function () {
        var startCheck = document.getElementById('startCheck').checked;
        var conCheck = document.getElementById('conCheck').checked;
        var startInput = document.getElementById('startInput');
        var conInput = document.getElementById('conInput');
        if (startCheck && !startInput.value) {
            ui.addValidator(startInput, 'uciname', true, function (v) {
                if (v !== '') {
                    return true;
                }
                else {
                    return '请输入开机自测试周期';
                }
            }, 'blur', 'keyup');
            return;
        }
        if (conCheck && !conInput.value) {
            ui.addValidator(conInput, 'uciname', true, function (v) {
                if (v !== '') {
                    return true;
                }
                else {
                    return '请输入条件自测试周期';
                }
            }, 'blur', 'keyup');
            return;
        }

        this.saveConfig({
            startOpen: startCheck ? 1 : 0,
            startTime: startInput.value,
            conOpen: conCheck ? 1 : 0,
            conTime: conInput.value
        });

    },
    load: async function () {
        var data = await this.getConfig();
        return data;
    },
    render: function (data) {
        return E('div', { class: 'cbi-map' }, [
            E('link', { rel: 'stylesheet', type: 'text/css', href: '/luci-static/resources/view/ca/index.css' }),
            E('h2', {}, '周期自测试'),
            E('div', { class: 'cbi-map-descr' }, '自测试的周期配置'),
            E('div', { class: 'cbi-selection' }, [
                E('div', { class: 'cbi-section-node' }, [
                    this.renderField('开机自测试周期执行', [
                        E('input', { id: 'startCheck', checked: data.startOpen == '1' ? true : undefined, type: 'checkbox', change: ui.createHandlerFn(this, 'startChange') })
                    ]),
                    this.renderField('周期', [
                        E('input', { id: 'startInput', type: 'text', value: data.startTime, placeholder: '请输入周期，单位小时' })
                    ], data.startOpen),
                    this.renderField('条件自测试周期执行', [
                        E('input', { id: 'conCheck', checked: data.conOpen == '1' ? true : undefined, type: 'checkbox', change: ui.createHandlerFn(this, 'conChange') })
                    ]),
                    this.renderField('周期', [
                        E('input', { id: 'conInput', type: 'text', value: data.conTime, placeholder: '请输入周期，单位小时' })
                    ], data.conOpen)
                ])
            ])
        ]);
    },
    renderField(title, ele, show = true) {
        return E('div', {
            class: 'cbi-value',
            style: `display: ${show == '1' ? 'flex' : 'none'}`
        }, [
            E('label', { class: 'cbi-value-title' }, title),
            E('div', { class: 'cbi-value-field' }, ele)
        ]);
    },
    showToast(msg, type = 'warning') {
        // type : info/success/warning
        document.querySelector('#maincontent .alert-message') && document.querySelector('#maincontent .alert-message').remove();
        ui.addNotification('提示', E('p', msg), type);
    },
    // 开启自测试
    startChange(e) {
        var checked = e.target.checked;
        document.getElementById('startInput').parentNode.parentNode.style.display = checked ? 'flex' : 'none';
    },
    // 条件自测试
    conChange(e) {
        var checked = e.target.checked;
        document.getElementById('conInput').parentNode.parentNode.style.display = checked ? 'flex' : 'none';
    },
    async getConfig() {
        var res = await request.get(baseUrl + '/get_config');
        console.log(res);
        if (res.responseText) {
            var resJson = JSON.parse(res.responseText);
            if (resJson.status == 'ok') {
                return resJson.data;
            }
            return {
                startOpen: 0,
                conOpen: 0
            };
        }
        return {
            startOpen: 0,
            conOpen: 0
        };
    },
    saveConfig(data) {
        var form = new FormData();
        Object.keys(data).forEach(function (key) {
            form.append(key, data[key]);
        });
        request.post(baseUrl + '/save_config', form).then(res => {
            console.log(res);
            if (res.status = 200 && res.responseText) {
                var resJson = JSON.parse(res.responseText);
                if (resJson.status == 'ok') {
                    this.showToast('保存成功', 'success');
                } else {
                    this.showToast('保存失败', 'error');
                }
            }
        });
    }
});