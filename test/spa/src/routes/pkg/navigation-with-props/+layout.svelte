<script lang="ts">
  import { onMount } from "svelte";
  import { configure } from "onedollarstats";

  onMount(() => {
    configure({ hostname: "example.com", devmode: true });
  });
</script>

<slot />
