new Vue({
    el: '#app',
    data() {
        return {
            username: '',
            siteName: '',
            siteSettings: {
                name: '',
                address: '',
                phone: '',
                wechat: '',
                description: '',
                business_hours: '',
                is_open: true
            }
        }
    },
    created() {
        this.checkAuth();
        this.loadSiteSettings();
    },
    methods: {
        async checkAuth() {
            try {
                const response = await axios.get('/api/auth/check');
                this.username = response.data.username;
                this.siteName = response.data.site_name;
                
                // 如果不是管理员,跳转回主页
                if (!response.data.is_admin) {
                    this.$message.error('没有权限访问此页面');
                    window.location.href = '/static/shop.html';
                }
            } catch (error) {
                this.$message.error('请先登录');
                window.location.href = '/static/login.html';
            }
        },
        async loadSiteSettings() {
            try {
                const response = await axios.get('/api/site-settings');
                this.siteSettings = response.data;
            } catch (error) {
                this.$message.error('加载站点设置失败');
            }
        },
        async updateSiteSettings() {
            try {
                await axios.put('/api/site-settings', this.siteSettings);
                this.$message.success('保存成功');
            } catch (error) {
                this.$message.error('保存失败');
            }
        },
        goBack() {
            window.location.href = '/static/shop.html';
        },
        async logout() {
            try {
                await axios.post('/api/auth/logout');
                window.location.href = '/static/login.html';
            } catch (error) {
                this.$message.error('退出失败');
            }
        }
    }
}); 