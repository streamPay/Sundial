<template>
    <div id="app">
        <div>
            <ui-header />
            <div id="main">
                <!-- <div class="content-box"> -->
                <router-view
                    :key="$route.path"
                />
                <!-- </div> -->
            </div>
        </div>
    </div>
</template>

<script>
import Header from '@/components/layout/Header'
export default {
    name: 'App',
    components: {
        uiHeader: Header,
    },
}
</script>
