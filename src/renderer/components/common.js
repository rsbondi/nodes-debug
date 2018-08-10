import Empty from './Empty'
import { empties } from '../misc'


export default  {
    computed: {
        currentView() {
            const currentType = this.$store.state.Nodes.currentType
            const loaded = this.$store.state.Nodes.loadedTypes
            const y = this.$store.state.Nodes.currentPage
            return loaded.length && ~loaded.indexOf(currentType) ? currentType + '-' + this.suffix : 'empty'
        }
    },
    methods: {
        emptyPage() {
            const page = this.$store.state.Nodes.currentPage 
            this.$store.commit(this.mutation, empties[page])           
        },
        getPage() { return this.$store.state.Nodes.currentPage }
    },
    data() {
        return {
            loading: false
        }
    },
    components: { Empty }      
}
